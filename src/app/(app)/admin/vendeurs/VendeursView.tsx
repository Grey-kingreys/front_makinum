"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert, Badge, Button, ConfirmDialog, Input, type BadgeVariant } from "@/components/ui";
import { describeAdminUserError, listAdminUsers, updateAdminUser, type AdminUserView } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import type { Role, StatutCompte, StatutVendeur } from "@/lib/auth/types";
import { initialsFromName } from "@/lib/format";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  VENDEUR: "Vendeur",
  ACHETEUR: "Acheteur",
};

const ROLE_OPTIONS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Tous les rôles" },
  { value: "ACHETEUR", label: "Acheteur" },
  { value: "VENDEUR", label: "Vendeur" },
  { value: "ADMIN", label: "Admin" },
];

const STATUT_COMPTE_OPTIONS: { value: StatutCompte | ""; label: string }[] = [
  { value: "", label: "Tous les comptes" },
  { value: "ACTIF", label: "Actif" },
  { value: "SUSPENDU", label: "Suspendu" },
];

const STATUT_VENDEUR_OPTIONS: { value: StatutVendeur | ""; label: string }[] = [
  { value: "", label: "Tous les niveaux" },
  { value: "LIBRE", label: "Libre" },
  { value: "VERIFIE", label: "Vérifié" },
  { value: "CONFIANCE", label: "Confiance" },
];

const STATUT_COMPTE_BADGE: Record<StatutCompte, BadgeVariant> = {
  ACTIF: "verifie",
  SUSPENDU: "danger",
};

const STATUT_VENDEUR_LABEL: Record<StatutVendeur, string> = {
  LIBRE: "Libre",
  VERIFIE: "Vérifié",
  CONFIANCE: "Confiance",
};

const STATUT_VENDEUR_BADGE: Record<StatutVendeur, BadgeVariant> = {
  LIBRE: "libre",
  VERIFIE: "verifie",
  CONFIANCE: "confiance",
};

/** Trois niveaux de confiance attribuables à la main (design : « statut de confiance »). */
const NIVEAUX_CONFIANCE: StatutVendeur[] = ["LIBRE", "VERIFIE", "CONFIANCE"];

interface RowState {
  pendingNiveau: boolean;
  pendingCompte: boolean;
  error: string | null;
}

const DEFAULT_ROW_STATE: RowState = { pendingNiveau: false, pendingCompte: false, error: null };

function UserRow({
  user,
  currentAdminId,
  rowState,
  onSetNiveau,
  onToggleCompte,
}: {
  user: AdminUserView;
  currentAdminId: string;
  rowState: RowState;
  onSetNiveau: (niveau: StatutVendeur) => void;
  onToggleCompte: () => void;
}) {
  const isSelf = user.id === currentAdminId;
  const suspendu = user.statutCompte === "SUSPENDU";

  return (
    <div className="border-b border-beige-soft px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-beige-soft text-[12.5px] font-semibold text-brand-muted">
            {initialsFromName(user.nom)}
          </div>
          <div>
            <div className="text-[14.5px] font-medium text-ink">{user.nom}</div>
            <div className="text-[12.5px] text-brand-faint">{user.telephone ?? user.email}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{ROLE_LABEL[user.role]}</Badge>
          <Badge variant={STATUT_COMPTE_BADGE[user.statutCompte]} dot>
            {user.statutCompte === "ACTIF" ? "actif" : "suspendu"}
          </Badge>
          {user.role === "VENDEUR" ? (
            <Badge variant={STATUT_VENDEUR_BADGE[user.statutVendeur]} dot>
              {STATUT_VENDEUR_LABEL[user.statutVendeur]}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {user.role === "VENDEUR" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12.5px] text-brand-faint">Attribuer :</span>
            {NIVEAUX_CONFIANCE.map((niveau) => (
              <button
                key={niveau}
                type="button"
                disabled={rowState.pendingNiveau || user.statutVendeur === niveau}
                onClick={() => onSetNiveau(niveau)}
                className={
                  "rounded-full border px-3 py-1 text-[12.5px] transition-colors disabled:cursor-not-allowed " +
                  (user.statutVendeur === niveau
                    ? "border-brand bg-brand text-cream"
                    : "border-border-strong bg-white text-ink hover:border-brand disabled:opacity-60")
                }
              >
                {STATUT_VENDEUR_LABEL[niveau]}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleCompte}
          disabled={rowState.pendingCompte || isSelf}
          title={isSelf ? "Tu ne peux pas suspendre ton propre compte." : undefined}
          className={suspendu ? undefined : "border-tint-danger-border text-danger hover:border-danger"}
        >
          {rowState.pendingCompte ? "…" : suspendu ? "Réactiver" : "Suspendre"}
        </Button>
      </div>

      {rowState.error ? (
        <p className="mt-2 text-[12.5px] text-danger">{rowState.error}</p>
      ) : null}
    </div>
  );
}

/**
 * « Vendeurs » (/admin/vendeurs) — écran isSellers du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html), étendu à tous les
 * comptes (pas seulement les vendeurs) : recherche nom/téléphone (déclenchée
 * au submit, pas à chaque frappe), filtres rôle/statut compte/statut
 * vendeur, attribution manuelle du niveau de confiance (LIBRE/VERIFIE/
 * CONFIANCE) et suspension/réactivation de compte — la suspension désactive
 * en cascade tout le catalogue du vendeur (voir
 * backend/src/reports/account-moderation.service.ts, `suspendre`) ; la
 * réactivation ne réactive pas les produits.
 */
export function VendeursView() {
  const { user: currentAdmin } = useAuth();

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [statutCompte, setStatutCompte] = useState<StatutCompte | "">("");
  const [statutVendeur, setStatutVendeur] = useState<StatutVendeur | "">("");

  const [items, setItems] = useState<AdminUserView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [confirmTarget, setConfirmTarget] = useState<AdminUserView | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listAdminUsers({
          q: qApplied || undefined,
          role: role || undefined,
          statutCompte: statutCompte || undefined,
          statutVendeur: statutVendeur || undefined,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(targetPage);
      } catch (err) {
        setError(describeAdminUserError(err, "Impossible de charger la liste des utilisateurs."));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [qApplied, role, statutCompte, statutVendeur],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial et à chaque changement de filtre/recherche appliquée, même convention que ProduitsView.
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage change déjà avec ces dépendances.
  }, [qApplied, role, statutCompte, statutVendeur]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQApplied(qInput.trim());
  }

  function rowStateFor(id: string): RowState {
    return rowStates[id] ?? DEFAULT_ROW_STATE;
  }

  function patchRowState(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_ROW_STATE), ...patch } }));
  }

  function applyUpdatedUser(updated: AdminUserView) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function handleSetNiveau(target: AdminUserView, niveau: StatutVendeur) {
    patchRowState(target.id, { pendingNiveau: true, error: null });
    try {
      const updated = await updateAdminUser(target.id, { statutVendeur: niveau });
      applyUpdatedUser(updated);
    } catch (err) {
      patchRowState(target.id, {
        error: describeAdminUserError(err, "Impossible de mettre à jour le niveau de confiance."),
      });
    } finally {
      patchRowState(target.id, { pendingNiveau: false });
    }
  }

  function toggleCompteMessage(target: AdminUserView): string {
    const suspendu = target.statutCompte === "SUSPENDU";
    return suspendu
      ? `Réactiver ${target.nom} ? Le compte redevient actif immédiatement ; les produits désactivés lors de la suspension resteront désactivés.`
      : target.role === "VENDEUR"
        ? `Suspendre ${target.nom} ? Son compte sera bloqué et tout son catalogue sera désactivé automatiquement.`
        : `Suspendre ${target.nom} ? Son compte sera bloqué.`;
  }

  function handleToggleCompte(target: AdminUserView) {
    setConfirmTarget(target);
  }

  async function confirmToggleCompte() {
    const target = confirmTarget;
    if (!target) return;
    const suspendu = target.statutCompte === "SUSPENDU";
    setConfirmTarget(null);

    patchRowState(target.id, { pendingCompte: true, error: null });
    try {
      const updated = await updateAdminUser(target.id, {
        statutCompte: suspendu ? "ACTIF" : "SUSPENDU",
      });
      applyUpdatedUser(updated);
    } catch (err) {
      patchRowState(target.id, {
        error: describeAdminUserError(err, "Impossible de mettre à jour ce compte."),
      });
    } finally {
      patchRowState(target.id, { pendingCompte: false });
    }
  }

  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-[1000px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Vendeurs
        </h1>
        <p className="text-[14.5px] text-brand-subtle">
          Le statut de confiance est attribué manuellement. Aucune progression automatique en V1.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label="Recherche"
          placeholder="Nom ou téléphone"
          value={qInput}
          onChange={(event) => setQInput(event.target.value)}
          containerClassName="min-w-[220px] flex-1"
        />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-[7px] text-[13px] text-brand-muted">
          Rôle
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role | "")}
            className="rounded-md border border-border-strong bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus-visible:shadow-focus-brand"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[7px] text-[13px] text-brand-muted">
          Statut compte
          <select
            value={statutCompte}
            onChange={(event) => setStatutCompte(event.target.value as StatutCompte | "")}
            className="rounded-md border border-border-strong bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus-visible:shadow-focus-brand"
          >
            {STATUT_COMPTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[7px] text-[13px] text-brand-muted">
          Statut vendeur
          <select
            value={statutVendeur}
            onChange={(event) => setStatutVendeur(event.target.value as StatutVendeur | "")}
            className="rounded-md border border-border-strong bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus-visible:shadow-focus-brand"
          >
            {STATUT_VENDEUR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchPage(1, false)}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-beige-soft" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center text-[14.5px] text-brand-subtle">
          Aucun utilisateur ne correspond à ces filtres.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-border bg-white">
          {items.map((item) => (
            <UserRow
              key={item.id}
              user={item}
              currentAdminId={currentAdmin?.id ?? ""}
              rowState={rowStateFor(item.id)}
              onSetNiveau={(niveau) => handleSetNiveau(item, niveau)}
              onToggleCompte={() => handleToggleCompte(item)}
            />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" onClick={() => fetchPage(page + 1, true)} disabled={loadingMore}>
            {loadingMore ? "Chargement…" : "Voir plus"}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.statutCompte === "SUSPENDU" ? "Réactiver ce compte ?" : "Suspendre ce compte ?"}
        description={confirmTarget ? toggleCompteMessage(confirmTarget) : null}
        confirmLabel={confirmTarget?.statutCompte === "SUSPENDU" ? "Réactiver" : "Suspendre"}
        variant={confirmTarget?.statutCompte === "SUSPENDU" ? "default" : "danger"}
        onConfirm={confirmToggleCompte}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
