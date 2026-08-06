"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./Button";

export type ConfirmDialogVariant = "default" | "danger";

export interface ConfirmDialogProps {
  /** Affiche la modale. `false` : ne rend rien (pas de démontage animé en V1). */
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` : bouton de confirmation en rouge (action destructrice/irréversible). */
  variant?: ConfirmDialogVariant;
  /** Désactive les deux boutons pendant l'exécution de l'action confirmée. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Boîte de dialogue de confirmation du design system (T35) — remplace les
 * `window.confirm` natifs (popup navigateur hors charte, non personnalisable)
 * partout où une action doit être confirmée avant exécution : envoi/annulation
 * de demande, désactivation/suspension admin, clôture de demande, etc.
 *
 * Accessibilité (WAI-ARIA dialog pattern) : `role="dialog"` + `aria-modal`,
 * titre relié par `aria-labelledby`, focus déplacé dans la modale à
 * l'ouverture (sur le bouton Annuler — le choix le plus sûr par défaut,
 * y compris pour les actions non destructives) et piégé dedans (Tab/Shift+Tab
 * ne quittent jamais la modale), fermeture par Échap ou clic sur
 * l'arrière-plan, focus rendu à l'élément déclencheur à la fermeture.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCancel change à chaque rendu du parent (fermeture non mémoïsée) ; seul `open` doit ré-armer focus/écouteur.
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[420px] rounded-xl border border-border bg-white p-6 shadow-soft-lg"
      >
        <h2 id={titleId} className="font-display text-[17px] font-bold text-ink">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 text-[13.5px] leading-relaxed text-brand-subtle">{description}</div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
