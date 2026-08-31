"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { useGeo } from "@/lib/geo";
import { describeVendorSettingsError, updateVendorSettings } from "@/lib/vendor-settings";

/**
 * « Paramètres » (/vendeur/parametres, T52b, étendu T66b) — réservée VENDEUR
 * par VendeurGuard (page.tsx, même garde que catalogue/demandes reçues) : ce
 * composant peut donc supposer `user.role === "VENDEUR"`. Deux réglages :
 * `autoriseAdminPublication`, le consentement à ce qu'un administrateur
 * publie/modifie des produits dans le catalogue du vendeur en son nom (voir
 * l'action admin « Publier un produit », src/app/(app)/admin/vendeurs/) ; et
 * `lieuVente` (T66a), la position du lieu de vente du compte — réglée une
 * fois ici, elle pré-remplit chaque nouvelle publication côté ProductForm
 * (T66b) plutôt que de forcer le vendeur à recapturer sa position à chaque
 * produit (levier principal contre le « 0 produit géolocalisé » constaté en
 * prod).
 *
 * Pas de ConfirmDialog : les deux actions sont réversibles et sans
 * conséquence destructive (le vendeur peut désactiver/retirer à tout moment,
 * le backend n'a aucune garde métier sur ce PATCH) — seulement un retour
 * visuel clair de l'état enregistré et une gestion d'erreur. L'interrupteur
 * et le lieu de vente reflètent directement `user.autoriseAdminPublication`/
 * `user.lieuVente` (pas d'état optimiste dupliqué) : après un succès,
 * `refresh()` (AuthProvider, même mécanisme que DevenirVendeurView après
 * T48b) recharge la session avant que l'affichage ne change visuellement —
 * source de vérité unique, rien à annuler en cas d'échec. Les deux réglages
 * partagent le même état saving/error/justSaved : une seule action de ce
 * type est plausible à la fois côté UI (deux contrôles, un seul clic
 * possible), un état par champ serait une complexité inutile.
 */
export function VendeurParametresView() {
  const { user, refresh } = useAuth();
  const { status: geoStatus, position, request } = useGeo();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // Sticky tant que non retentée avec succès/échec API : distingue « jamais
  // demandé sur cette page » (aucun message) de « demandé ici et refusé par
  // le navigateur » (message d'erreur géoloc) — même convention que
  // `wantsPosition` de ProductForm (T65), qui ne réagit qu'à une demande
  // explicite sur CE composant, jamais à un état géoloc hérité d'ailleurs
  // dans la session (ex. /produits).
  const [locationRequested, setLocationRequested] = useState(false);

  const checked = user?.autoriseAdminPublication ?? false;

  async function saveLieuVente(lieuVente: { latitude: number; longitude: number } | null) {
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      await updateVendorSettings({ lieuVente });
      await refresh();
      setJustSaved(true);
      setLocationRequested(false);
    } catch (err) {
      setError(describeVendorSettingsError(err));
      setLocationRequested(false);
    } finally {
      setSaving(false);
    }
  }

  // N'enregistre la position acquise que si l'utilisateur a explicitement
  // cliqué « Utiliser ma position actuelle » sur CETTE page (locationRequested)
  // — sinon une géoloc déjà accordée ailleurs dans la session écraserait
  // silencieusement le lieu de vente dès l'arrivée sur l'écran.
  useEffect(() => {
    if (locationRequested && geoStatus === "granted" && position) {
      // Synchronise avec le système externe navigator.geolocation (via
      // useGeo) : la position n'est connue qu'une fois le navigateur revenu,
      // l'enregistrer ici est le point d'entrée légitime — même convention
      // que l'effet équivalent de ProductForm (T65).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void saveLieuVente({ latitude: position.lat, longitude: position.lng });
    }
    // saveLieuVente est stable en pratique (recréée à chaque rendu mais son
    // corps ne dépend que de props/état déjà listés ailleurs) — l'omettre des
    // dépendances évite une boucle de ré-déclenchement sans changer le
    // comportement, même convention que l'effet équivalent de ProductForm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRequested, geoStatus, position]);

  if (!user) return null;

  function handleUseLocation() {
    setError(null);
    setJustSaved(false);
    setLocationRequested(true);
    if (geoStatus === "idle" || geoStatus === "denied") {
      request();
    }
  }

  function handleRemoveLocation() {
    void saveLieuVente(null);
  }

  async function handleToggle() {
    const next = !checked;
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      await updateVendorSettings({ autoriseAdminPublication: next });
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

      <div className="mt-5 rounded-xl border border-border bg-white p-5">
        <div className="text-[15px] font-medium text-ink">Mon lieu de vente</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-brand-subtle">
          Enregistre une fois la position de ton lieu de vente : elle pré-remplira chaque nouveau
          produit.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseLocation}
            disabled={saving || geoStatus === "asking"}
          >
            {geoStatus === "asking" ? "Localisation…" : "Utiliser ma position actuelle"}
          </Button>
          {user.lieuVente ? (
            <span className="inline-flex items-center gap-1 text-[12.5px] text-brand-subtle">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Lieu de vente enregistré{" "}
              <button
                type="button"
                onClick={handleRemoveLocation}
                disabled={saving}
                className="underline hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                Retirer
              </button>
            </span>
          ) : locationRequested && geoStatus === "denied" ? (
            <span className="text-[12.5px] text-danger">Position indisponible — réessaie.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
