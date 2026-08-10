"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, Badge, Button, ConfirmDialog, Input, type BadgeVariant } from "@/components/ui";
import {
  describeAdminUserError,
  describeConvertVendeurFormError,
  listAdminUsers,
  updateAdminUser,
  type AdminUserView,
} from "@/lib/admin";
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
  pendingValidation: boolean;
  /** T48b : conversion ACHETEUR → VENDEUR (PATCH { role: "VENDEUR" }) en vol. */
  pendingConvert: boolean;
  error: string | null;
}

const DEFAULT_ROW_STATE: RowState = {
  pendingNiveau: false,
  pendingCompte: false,
  pendingValidation: false,
  pendingConvert: false,
  error: null,
};

function UserRow({
  user,
  currentAdminId,
  rowState,
  onSetNiveau,
  onToggleCompte,
  onValider,
  onConvertToVendeur,
}: {
  user: AdminUserView;
  currentAdminId: string;
  rowState: RowState;
  onSetNiveau: (niveau: StatutVendeur) => void;
  onToggleCompte: () => void;
  onValider: () => void;
  onConvertToVendeur: () => void;
}) {
  const isSelf = user.id === currentAdminId;
  const suspendu = user.statutCompte === "SUSPENDU";
  const enAttenteValidation = user.role === "VENDEUR" && !user.vendeurValide;

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
          {user.role === "VENDEUR" ? (
            <Badge variant={user.vendeurValide ? "verifie" : "confiance"} dot>
              {user.vendeurValide ? "Validé" : "En attente de validation"}
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

        <div className="flex items-center gap-2">
          {enAttenteValidation ? (
            <Button size="sm" variant="primary" onClick={onValider} disabled={rowState.pendingValidation}>
              {rowState.pendingValidation ? "…" : "Valider"}
            </Button>
          ) : null}

          {user.role === "ACHETEUR" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onConvertToVendeur}
              disabled={rowState.pendingConvert}
            >
              {rowState.pendingConvert ? "…" : "Passer vendeur"}
            </Button>
          ) : null}

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
      </div>

      {rowState.error ? (
        <p className="mt-2 text-[12.5px] text-danger">{rowState.error}</p>
      ) : null}
    </div>
  );
}

type ConfirmAction =
  | { kind: "toggleCompte"; target: AdminUserView }
  | { kind: "validerVendeur"; target: AdminUserView }
  | { kind: "convertToVendeur"; target: AdminUserView };

/**
 * « Utilisateurs » (/admin/vendeurs) — écran isSellers du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html), étendu à tous les
 * comptes (pas seulement les vendeurs) : recherche nom/téléphone (déclenchée
 * au submit, pas à chaque frappe), filtres rôle/statut compte/statut
 * vendeur/validation vendeur (T30), attribution manuelle du niveau de
 * confiance (LIBRE/VERIFIE/CONFIANCE), validation d'un compte vendeur en
 * attente et suspension/réactivation de compte — la suspension désactive en
 * cascade tout le catalogue du vendeur (voir
 * backend/src/reports/account-moderation.service.ts, `suspendre`) ; la
 * réactivation ne réactive pas les produits. Sur une ligne ACHETEUR,
 * « Passer vendeur » (T48b, action admin équivalente au chemin libre-service
 * /devenir-vendeur) ouvre une modale demandant le téléphone de la cible
 * seulement si elle n'en a pas déjà un, avec une case « Valider
 * immédiatement » qui ajoute `vendeurValide: true` au même PATCH
 * (conversion + validation en un seul appel).
 */
export function VendeursView() {
  const { user: currentAdmin } = useAuth();
  const searchParams = useSearchParams();
  const initialPendingOnly = searchParams.get("vendeurValide") === "false";

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [role, setRole] = useState<Role | "">(initialPendingOnly ? "VENDEUR" : "");
  const [statutCompte, setStatutCompte] = useState<StatutCompte | "">("");
  const [statutVendeur, setStatutVendeur] = useState<StatutVendeur | "">("");
  /** Filtre « en attente de validation » (T30) — s'appuie sur `vendeurValide=false`. */
  const [pendingOnly, setPendingOnly] = useState(initialPendingOnly);

  const [items, setItems] = useState<AdminUserView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  // Champs de la modale « Passer vendeur » (T48b) — un seul jeu d'état, pas
  // par ligne : une seule modale peut être ouverte à la fois.
  const [convertTelephone, setConvertTelephone] = useState("");
  const [convertTelephoneError, setConvertTelephoneError] = useState<string | null>(null);
  const [convertValiderImmediat, setConvertValiderImmediat] = useState(false);

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
          vendeurValide: pendingOnly ? false : undefined,
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
    [qApplied, role, statutCompte, statutVendeur, pendingOnly],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial et à chaque changement de filtre/recherche appliquée, même convention que ProduitsView.
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage change déjà avec ces dépendances.
  }, [qApplied, role, statutCompte, statutVendeur, pendingOnly]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQApplied(qInput.trim());
  }

  /** Cocher le filtre présélectionne aussi le rôle VENDEUR (seul rôle où `vendeurValide` a un sens). */
  function handlePendingOnlyChange(checked: boolean) {
    setPendingOnly(checked);
    if (checked) setRole("VENDEUR");
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
    setConfirmAction({ kind: "toggleCompte", target });
  }

  function handleValiderVendeur(target: AdminUserView) {
    setConfirmAction({ kind: "validerVendeur", target });
  }

  function handleConvertToVendeur(target: AdminUserView) {
    setConvertTelephone("");
    setConvertTelephoneError(null);
    setConvertValiderImmediat(false);
    setConfirmAction({ kind: "convertToVendeur", target });
  }

  async function confirmToggleCompte(target: AdminUserView) {
    const suspendu = target.statutCompte === "SUSPENDU";

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

  /** Valide le vendeur puis rafraîchit la liste (nécessaire pour que la ligne disparaisse du filtre « en attente »). */
  async function confirmValiderVendeur(target: AdminUserView) {
    patchRowState(target.id, { pendingValidation: true, error: null });
    try {
      await updateAdminUser(target.id, { vendeurValide: true });
      await fetchPage(1, false);
    } catch (err) {
      patchRowState(target.id, {
        pendingValidation: false,
        error: describeAdminUserError(err, "Impossible de valider ce vendeur."),
      });
      return;
    }
    patchRowState(target.id, { pendingValidation: false });
  }

  /**
   * PATCH /admin/utilisateurs/:id { role: "VENDEUR", telephone?, vendeurValide? }
   * (T48b). Renvoie `"retry"` seulement pour une erreur corrigible sur le
   * téléphone (la modale reste ouverte, l'admin corrige la saisie) ; `"ok"`
   * pour un succès ou une erreur générale (ALREADY_VENDOR,
   * CANNOT_CONVERT_ADMIN) — la modale se ferme, l'erreur générale reste
   * visible sur la ligne (même zone que les autres actions de la ligne).
   */
  async function confirmConvertToVendeur(
    target: AdminUserView,
    telephone: string | undefined,
  ): Promise<"ok" | "retry"> {
    patchRowState(target.id, { pendingConvert: true, error: null });
    setConvertTelephoneError(null);
    try {
      await updateAdminUser(target.id, {
        role: "VENDEUR",
        telephone,
        vendeurValide: convertValiderImmediat ? true : undefined,
      });
      await fetchPage(1, false);
      patchRowState(target.id, { pendingConvert: false });
      return "ok";
    } catch (err) {
      const { field, message } = describeConvertVendeurFormError(
        err,
        "Impossible de convertir ce compte en vendeur.",
      );
      patchRowState(target.id, { pendingConvert: false, error: field === "telephone" ? null : message });
      if (field === "telephone") {
        setConvertTelephoneError(message);
        return "retry";
      }
      return "ok";
    }
  }

  async function handleConfirm() {
    const action = confirmAction;
    if (!action) return;

    if (action.kind === "toggleCompte") {
      setConfirmAction(null);
      await confirmToggleCompte(action.target);
      return;
    }
    if (action.kind === "validerVendeur") {
      setConfirmAction(null);
      await confirmValiderVendeur(action.target);
      return;
    }

    // convertToVendeur : reste ouverte tant qu'une erreur de téléphone
    // corrigible (client ou serveur) n'est pas résolue.
    const needsTelephone = !action.target.telephone;
    if (needsTelephone) {
      const trimmed = convertTelephone.trim();
      if (!trimmed) {
        setConvertTelephoneError("Un numéro de téléphone est requis pour convertir ce compte en vendeur.");
        return;
      }
    }
    const outcome = await confirmConvertToVendeur(
      action.target,
      needsTelephone ? convertTelephone.trim() : undefined,
    );
    if (outcome === "ok") setConfirmAction(null);
  }

  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-[1000px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Utilisateurs
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
        <label className="flex items-center gap-2 self-end pb-2.5 text-[13px] text-brand-muted">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(event) => handlePendingOnlyChange(event.target.checked)}
            className="h-4 w-4 rounded border-border-strong"
          />
          En attente de validation
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
              onValider={() => handleValiderVendeur(item)}
              onConvertToVendeur={() => handleConvertToVendeur(item)}
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
        open={confirmAction !== null}
        title={
          confirmAction?.kind === "validerVendeur"
            ? "Valider ce vendeur ?"
            : confirmAction?.kind === "convertToVendeur"
              ? "Passer ce compte vendeur ?"
              : confirmAction?.target.statutCompte === "SUSPENDU"
                ? "Réactiver ce compte ?"
                : "Suspendre ce compte ?"
        }
        description={
          confirmAction?.kind === "validerVendeur" ? (
            `Valider le compte de ${confirmAction.target.nom} ? Il pourra publier des produits et sera notifié de la validation.`
          ) : confirmAction?.kind === "convertToVendeur" ? (
            <div className="flex flex-col gap-3">
              <p>
                Passer {confirmAction.target.nom} en compte vendeur ? Il pourra publier des produits
                une fois son compte validé, et sera notifié de la conversion.
              </p>
              {!confirmAction.target.telephone ? (
                <Input
                  label="Téléphone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+224 622 00 00 00"
                  value={convertTelephone}
                  onChange={(event) => {
                    setConvertTelephone(event.target.value);
                    setConvertTelephoneError(null);
                  }}
                  error={convertTelephoneError ?? undefined}
                  disabled={rowStateFor(confirmAction.target.id).pendingConvert}
                  required
                />
              ) : null}
              <label className="flex items-center gap-2 text-[13px] text-brand-muted">
                <input
                  type="checkbox"
                  checked={convertValiderImmediat}
                  onChange={(event) => setConvertValiderImmediat(event.target.checked)}
                  className="h-4 w-4 rounded border-border-strong"
                  disabled={rowStateFor(confirmAction.target.id).pendingConvert}
                />
                Valider immédiatement
              </label>
            </div>
          ) : confirmAction ? (
            toggleCompteMessage(confirmAction.target)
          ) : null
        }
        confirmLabel={
          confirmAction?.kind === "validerVendeur"
            ? "Valider"
            : confirmAction?.kind === "convertToVendeur"
              ? "Passer vendeur"
              : confirmAction?.target.statutCompte === "SUSPENDU"
                ? "Réactiver"
                : "Suspendre"
        }
        variant={
          confirmAction?.kind === "validerVendeur" ||
          confirmAction?.kind === "convertToVendeur" ||
          confirmAction?.target.statutCompte === "SUSPENDU"
            ? "default"
            : "danger"
        }
        busy={confirmAction?.kind === "convertToVendeur" && rowStateFor(confirmAction.target.id).pendingConvert}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
