"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, Badge, Button, ConfirmDialog, type BadgeVariant } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  describeReportError,
  listReports,
  updateReport,
  type ActionAdmin,
  type ReportView,
  type StatutSignalement,
} from "@/lib/reports";

const PAGE_SIZE = 20;

const STATUT_LABEL: Record<StatutSignalement, string> = {
  NOUVEAU: "Nouveau",
  EN_EXAMEN: "En examen",
  TRAITE: "Traité",
};

const STATUT_BADGE_VARIANT: Record<StatutSignalement, BadgeVariant> = {
  NOUVEAU: "danger",
  EN_EXAMEN: "confiance",
  TRAITE: "verifie",
};

const STATUT_TABS: { value: StatutSignalement | undefined; label: string }[] = [
  { value: undefined, label: "Tous" },
  { value: "NOUVEAU", label: "Nouveaux" },
  { value: "EN_EXAMEN", label: "En examen" },
  { value: "TRAITE", label: "Traités" },
];

/** Les 5 actions possibles en clôturant un signalement (voir reports.service.ts, executerAction). */
const ACTIONS: ActionAdmin[] = ["AUCUNE", "AVERTISSEMENT", "CONTACT", "DESACTIVATION", "SUSPENSION"];

const ACTION_INFO: Record<ActionAdmin, { label: string; description: string }> = {
  AUCUNE: {
    label: "Ne rien faire · classer",
    description: "Classe le signalement sans autre action. Aucune notification n'est envoyée.",
  },
  AVERTISSEMENT: {
    label: "Avertir",
    description: "Envoie une notification d'avertissement au vendeur, avec le motif du signalement.",
  },
  CONTACT: {
    label: "Contacter",
    description: "Aucun effet automatique — à utiliser après avoir contacté le vendeur par un autre canal.",
  },
  DESACTIVATION: {
    label: "Désactiver le produit",
    description: "Désactive immédiatement le produit signalé. Les acheteurs ne le voient plus.",
  },
  SUSPENSION: {
    label: "Suspendre le vendeur",
    description:
      "Suspend le compte du vendeur, désactive tout son catalogue en cascade et le notifie. Il ne peut plus se connecter.",
  },
};

/** Actions dont l'exécution est irréversible ou lourde de conséquences : confirmation exigée avant envoi. */
const ACTIONS_A_CONFIRMER: ReadonlySet<ActionAdmin> = new Set(["DESACTIVATION", "SUSPENSION"]);

interface PanelState {
  action: ActionAdmin;
  pending: boolean;
  error: string | null;
}

const DEFAULT_PANEL: PanelState = { action: "AUCUNE", pending: false, error: null };

function ReportCard({
  report,
  panel,
  onSetAction,
  onPasserEnExamen,
  onTraiter,
}: {
  report: ReportView;
  panel: PanelState;
  onSetAction: (action: ActionAdmin) => void;
  onPasserEnExamen: () => void;
  onTraiter: () => void;
}) {
  const canTraiter = report.statut !== "TRAITE";
  const desactivationIndisponible = !report.produit;

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[14.5px] text-ink">
          <span className="font-medium">{report.signaleur.nom}</span>
          <span className="text-brand-faint" aria-hidden="true">
            →
          </span>
          <span className="font-medium">{report.cible.nom}</span>
        </div>
        <Badge variant={STATUT_BADGE_VARIANT[report.statut]} dot>
          {STATUT_LABEL[report.statut]}
        </Badge>
      </div>

      <p className="mb-2 text-[13.5px] leading-relaxed text-brand-muted">{report.motif}</p>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[12.5px] text-brand-faint">
        <span>Signalé le {formatDate(report.dateCreation)}</span>
        {report.produit ? (
          <Link href={`/produits/${report.produit.id}`} className="text-brand underline">
            Produit : {report.produit.titre}
          </Link>
        ) : null}
      </div>

      {report.statut === "TRAITE" ? (
        <p className="rounded-lg bg-tint-brand px-3.5 py-2.5 text-[13px] text-brand-vivid">
          Traité : {ACTION_INFO[report.actionAdmin].label}
        </p>
      ) : (
        <div className="border-t border-beige pt-4">
          {report.statut === "NOUVEAU" ? (
            <Button size="sm" variant="outline" className="mb-4" onClick={onPasserEnExamen} disabled={panel.pending}>
              Passer en examen
            </Button>
          ) : null}

          <fieldset className="mb-3">
            <legend className="mb-2 text-[13px] text-brand-muted">Clôturer avec l&apos;action…</legend>
            <div className="flex flex-col gap-2">
              {ACTIONS.map((action) => {
                const disabled = action === "DESACTIVATION" && desactivationIndisponible;
                return (
                  <label
                    key={action}
                    className={
                      "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] " +
                      (disabled
                        ? "cursor-not-allowed border-border bg-beige-soft/50 text-brand-faint"
                        : "cursor-pointer border-border-strong text-ink hover:border-brand")
                    }
                  >
                    <input
                      type="radio"
                      name={`action-${report.id}`}
                      value={action}
                      checked={panel.action === action}
                      disabled={disabled}
                      onChange={() => onSetAction(action)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium">{ACTION_INFO[action].label}</span>
                      <span className="block text-[12.5px] text-brand-faint">
                        {ACTION_INFO[action].description}
                        {disabled ? " (aucun produit rattaché à ce signalement)" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {panel.error ? (
            <Alert variant="danger" className="mb-3">
              {panel.error}
            </Alert>
          ) : null}

          <Button onClick={onTraiter} disabled={panel.pending || !canTraiter} aria-busy={panel.pending}>
            {panel.pending ? "Envoi…" : "Marquer comme traité"}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * « File de modération » (/admin/moderation) — écran isAdmin du prototype
 * (docs/Design de marketplace locale/Makinum.dc.html) : liste paginée des
 * signalements, filtre par statut, panneau de traitement par signalement
 * (EN_EXAMEN, ou TRAITE avec choix parmi les 5 actions réelles — voir
 * backend/src/reports/reports.service.ts, `executerAction`). Aucune
 * désactivation/suspension n'est automatique : DESACTIVATION exige un
 * produit rattaché, et les deux sont confirmées avant envoi.
 */
export function ModerationView() {
  const [statutFilter, setStatutFilter] = useState<StatutSignalement | undefined>(undefined);
  const [items, setItems] = useState<ReportView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<string, PanelState>>({});
  const [confirmTarget, setConfirmTarget] = useState<ReportView | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listReports({ statut: statutFilter, page: targetPage, limit: PAGE_SIZE });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(targetPage);
      } catch (err) {
        setError(describeReportError(err, "Impossible de charger la file de modération."));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [statutFilter],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial et à chaque changement de filtre, même convention que ProduitsView.
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage change avec statutFilter, déjà listé indirectement.
  }, [statutFilter]);

  function panelFor(id: string): PanelState {
    return panels[id] ?? DEFAULT_PANEL;
  }

  function setPanel(id: string, patch: Partial<PanelState>) {
    setPanels((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_PANEL), ...patch } }));
  }

  function applyUpdatedReport(updated: ReportView) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function handlePasserEnExamen(report: ReportView) {
    setPanel(report.id, { pending: true, error: null });
    try {
      const updated = await updateReport(report.id, { statut: "EN_EXAMEN" });
      applyUpdatedReport(updated);
    } catch (err) {
      setPanel(report.id, { error: describeReportError(err, "Impossible de mettre à jour ce signalement.") });
    } finally {
      setPanel(report.id, { pending: false });
    }
  }

  function traiterMessage(report: ReportView): string {
    const { action } = panelFor(report.id);
    return action === "DESACTIVATION"
      ? `Désactiver « ${report.produit?.titre ?? "ce produit"} » ? Il ne sera plus visible des acheteurs.`
      : `Suspendre ${report.cible.nom} ? Son compte et tout son catalogue seront désactivés.`;
  }

  async function traiter(report: ReportView) {
    const { action } = panelFor(report.id);
    setPanel(report.id, { pending: true, error: null });
    try {
      const updated = await updateReport(report.id, { statut: "TRAITE", actionAdmin: action });
      applyUpdatedReport(updated);
    } catch (err) {
      setPanel(report.id, { error: describeReportError(err, "Impossible de traiter ce signalement.") });
    } finally {
      setPanel(report.id, { pending: false });
    }
  }

  function handleTraiter(report: ReportView) {
    const { action } = panelFor(report.id);
    if (ACTIONS_A_CONFIRMER.has(action)) {
      setConfirmTarget(report);
      return;
    }
    traiter(report);
  }

  async function confirmTraiter() {
    const report = confirmTarget;
    if (!report) return;
    setConfirmTarget(null);
    await traiter(report);
  }

  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-[900px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <div className="mb-[22px]">
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          File de modération
        </h1>
        <p className="text-[14.5px] text-brand-subtle">
          Aucune désactivation n&apos;est automatique. Chaque cas est tranché à la main.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUT_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatutFilter(tab.value)}
            className={
              "rounded-full border px-4 py-2 text-[13.5px] transition-colors " +
              (statutFilter === tab.value
                ? "border-brand bg-brand text-cream"
                : "border-border-strong bg-white text-ink hover:border-brand")
            }
          >
            {tab.label}
          </button>
        ))}
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
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-beige-soft" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center text-[14.5px] text-brand-subtle">
          Aucun signalement pour ce filtre.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              panel={panelFor(report.id)}
              onSetAction={(action) => setPanel(report.id, { action, error: null })}
              onPasserEnExamen={() => handlePasserEnExamen(report)}
              onTraiter={() => handleTraiter(report)}
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
        title={
          confirmTarget && panelFor(confirmTarget.id).action === "DESACTIVATION"
            ? "Désactiver ce produit ?"
            : "Suspendre ce vendeur ?"
        }
        description={confirmTarget ? traiterMessage(confirmTarget) : null}
        confirmLabel={
          confirmTarget && panelFor(confirmTarget.id).action === "DESACTIVATION"
            ? "Désactiver"
            : "Suspendre"
        }
        variant="danger"
        onConfirm={confirmTraiter}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
