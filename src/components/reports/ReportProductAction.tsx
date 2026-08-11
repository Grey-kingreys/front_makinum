"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Alert } from "@/components/ui";
import { buildLoginHref, useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createReport, describeReportError, MOTIF_MAX_LENGTH, MOTIF_MIN_LENGTH } from "@/lib/reports";

interface ReportProductActionProps {
  /** Cible du signalement — le vendeur du produit affiché (`utilisateurCibleId`). */
  vendeurId: string;
  /** Rattache le signalement au produit consulté. */
  produitId?: string;
  className?: string;
}

/**
 * Action discrète « Signaler ce produit » (fiche produit, écran isReport du
 * prototype docs/Design de marketplace locale/Makinum.dc.html) — ouvre une
 * modale avec un motif libre (5 à 500 caractères, compteur) plutôt que la
 * liste de motifs prédéfinis du prototype : le contrat réel
 * (POST /signalements, backend/src/reports/dto/create-report.dto.ts) n'a
 * qu'un champ texte `motif`. Masquée quand l'utilisateur connecté est
 * lui-même le vendeur ciblé (auto-signalement, CANNOT_REPORT_SELF).
 * Composant volontairement autonome (déclenche + modale) pour rester
 * réutilisable partout où un produit est affiché.
 *
 * `POST /signalements` exige un JWT (backend, JwtAuthGuard) : un visiteur
 * anonyme (T51 — fiche produit consultable sans compte) ne doit jamais
 * atteindre ce point, sous peine de 401 silencieux à l'envoi du formulaire.
 * Le déclencheur devient alors un lien vers /connexion?returnTo=<chemin
 * courant> plutôt qu'un bouton ouvrant la modale — même motif que le bouton
 * « Ajouter à ma demande » (src/app/(app)/produits/[id]/ProductDetail.tsx).
 */
export function ReportProductAction({ vendeurId, produitId, className }: ReportProductActionProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close() est stable pour ce composant, pas besoin de la lister.
  }, [open]);

  if (user && user.id === vendeurId) return null;

  if (!user) {
    return (
      <Link
        href={buildLoginHref(pathname)}
        className={cn("text-[13.5px] text-danger underline transition-opacity hover:opacity-80", className)}
      >
        Signaler ce produit
      </Link>
    );
  }

  function reset() {
    setMotif("");
    setError(null);
    setSubmitting(false);
    setSent(false);
  }

  function close() {
    if (submitting) return;
    setOpen(false);
    reset();
  }

  const trimmedLength = motif.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MOTIF_MIN_LENGTH;

  async function handleSubmit() {
    if (trimmedLength < MOTIF_MIN_LENGTH) {
      setError(`Décris le problème en au moins ${MOTIF_MIN_LENGTH} caractères.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createReport({ utilisateurCibleId: vendeurId, produitId, motif: motif.trim() });
      setSent(true);
    } catch (err) {
      setError(describeReportError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("text-[13.5px] text-danger underline transition-opacity hover:opacity-80", className)}
      >
        Signaler ce produit
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[20px] border border-border bg-white p-[30px]"
          >
            {sent ? (
              <>
                <h2 id={headingId} className="mb-2 font-display text-[22px] font-bold text-ink">
                  Signalement envoyé
                </h2>
                <Alert variant="success" className="mb-5">
                  Signalement transmis. Il apparaît maintenant dans la file de modération de
                  l&apos;administrateur.
                </Alert>
                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-[11px] border border-border-strong bg-white px-4 py-3 text-[14.5px] text-ink transition-colors hover:border-brand"
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 id={headingId} className="mb-2 font-display text-[22px] font-bold text-ink">
                  Signaler ce produit
                </h2>
                <p className="mb-5 text-[14px] leading-relaxed text-brand-muted">
                  Un signalement ne désactive rien automatiquement. Il rejoint la file de
                  modération et un administrateur examine le cas.
                </p>

                <label htmlFor={`motif-${headingId}`} className="mb-2 block text-[13px] text-brand-muted">
                  Motif du signalement
                </label>
                <textarea
                  id={`motif-${headingId}`}
                  value={motif}
                  onChange={(event) => {
                    setMotif(event.target.value.slice(0, MOTIF_MAX_LENGTH));
                    setError(null);
                  }}
                  maxLength={MOTIF_MAX_LENGTH}
                  placeholder="Précise ce qui te semble anormal (arnaque, photos trompeuses, vendeur injoignable…)"
                  aria-invalid={tooShort ? true : undefined}
                  className={cn(
                    "min-h-[110px] w-full resize-y rounded-[12px] border bg-white px-3.5 py-3 text-[14.5px] text-ink outline-none placeholder:text-brand-placeholder focus-visible:shadow-focus-brand",
                    tooShort ? "border-danger" : "border-border-strong",
                  )}
                />
                <div className="mt-1.5 flex items-center justify-between text-[12px] text-brand-faint">
                  <span>{tooShort ? `Encore ${MOTIF_MIN_LENGTH - trimmedLength} caractère(s) minimum.` : ""}</span>
                  <span>
                    {motif.length} / {MOTIF_MAX_LENGTH}
                  </span>
                </div>

                {error ? (
                  <Alert variant="danger" className="mt-3">
                    {error}
                  </Alert>
                ) : null}

                <div className="mt-[22px] flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    aria-busy={submitting}
                    className="flex-1 rounded-[12px] bg-brand px-4 py-4 text-[15.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Envoi…" : "Envoyer le signalement"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="rounded-[12px] border border-border-strong bg-white px-5 py-4 text-[15px] text-ink transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
