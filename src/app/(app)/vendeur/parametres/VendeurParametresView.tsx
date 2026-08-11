"use client";

import { useState } from "react";

import { Alert } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { describeVendorSettingsError, updateVendorSettings } from "@/lib/vendor-settings";

/**
 * « Paramètres » (/vendeur/parametres, T52b) — réservée VENDEUR par
 * VendeurGuard (page.tsx, même garde que catalogue/demandes reçues) : ce
 * composant peut donc supposer `user.role === "VENDEUR"`. Un seul réglage en
 * V1 : `autoriseAdminPublication`, le consentement à ce qu'un administrateur
 * publie/modifie des produits dans le catalogue du vendeur en son nom (voir
 * l'action admin « Publier un produit », src/app/(app)/admin/vendeurs/).
 *
 * Pas de ConfirmDialog : action réversible et sans conséquence destructive
 * (le vendeur peut désactiver à tout moment, le backend n'a aucune garde
 * métier sur ce PATCH) — seulement un retour visuel clair de l'état
 * enregistré et une gestion d'erreur. L'interrupteur reflète directement
 * `user.autoriseAdminPublication` (pas d'état optimiste dupliqué) : après un
 * succès, `refresh()` (AuthProvider, même mécanisme que DevenirVendeurView
 * après T48b) recharge la session avant que l'interrupteur ne change
 * visuellement — source de vérité unique, rien à annuler en cas d'échec.
 */
export function VendeurParametresView() {
  const { user, refresh } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  if (!user) return null;

  const checked = user.autoriseAdminPublication;

  async function handleToggle() {
    const next = !checked;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      await updateVendorSettings(next);
      await refresh();
      setJustSaved(true);
    } catch (err) {
      setError(describeVendorSettingsError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Paramètres
      </h1>
      <p className="mb-6 text-[14.5px] leading-relaxed text-brand-subtle">
        Réglages de ton compte vendeur.
      </p>

      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
        </Alert>
      ) : null}
      {justSaved ? (
        <Alert variant="success" className="mb-5">
          Réglage enregistré.
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium text-ink">
              Autoriser l&apos;équipe Makinum à publier des produits pour moi
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-brand-subtle">
              Si tu actives ce réglage, un administrateur pourra créer et modifier des produits
              dans ton catalogue à ta place — utile si tu manques de temps pour le faire
              toi-même. Tu peux retirer cette autorisation à tout moment, et les produits déjà
              publiés resteront les tiens.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label="Autoriser l'équipe Makinum à publier des produits pour moi"
            onClick={handleToggle}
            disabled={saving}
            aria-busy={saving}
            className={cn(
              "relative mt-0.5 h-7 w-[46px] shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              checked ? "border-brand bg-brand" : "border-border-strong bg-beige-soft",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-soft transition-transform",
                checked ? "translate-x-[23px]" : "translate-x-[3px]",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
