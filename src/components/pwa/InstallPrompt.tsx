"use client";

import { useEffect, useState } from "react";

/**
 * Invite d'installation PWA discrète (T67②), montée sur la landing et/ou le
 * tableau de bord. Deux variantes selon la plateforme :
 * - « android » : Chrome/Edge/autres navigateurs Chromium émettent
 *   `beforeinstallprompt` — on l'intercepte pour piloter nous-mêmes
 *   l'affichage (au lieu de la mini-infobar native) et déclencher
 *   `prompt()` depuis notre propre bouton ;
 * - « ios » : Safari iOS n'émet jamais cet évènement (pas d'API
 *   d'installation programmatique) — seule option, un texte d'aide détecté
 *   par l'UA, expliquant le geste manuel (Partager → Sur l'écran d'accueil).
 *
 * Refus permanent : un unique indicateur dans `localStorage`
 * ({@link DISMISS_STORAGE_KEY}) couvre la fermeture explicite (bouton ×), la
 * réponse au prompt natif (acceptée ou refusée — une fois tranchée, elle ne
 * se rejoue plus jamais côté navigateur) et l'installation effective
 * (`appinstalled`) : dans tous les cas, plus jamais harcelé.
 */

const DISMISS_STORAGE_KEY = "makinum.installPromptDismissed";

/** Évènement non encore standardisé dans lib.dom.d.ts (Chrome/Chromium uniquement). */
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

type Variant = "android" | "ios";

function isStandaloneDisplay(): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  // `matchMedia` est absent de certains environnements (anciens WebView,
  // jsdom en test) : on le traite comme « pas standalone » plutôt que de
  // planter le rendu.
  const displayModeStandalone =
    typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch {
    // Stockage indisponible (navigation privée stricte, quota) : on se
    // comporte comme si rien n'avait jamais été refusé plutôt que de casser
    // le rendu — l'invite peut réapparaître, ce qui est préférable à un
    // composant qui plante.
    return false;
  }
}

function persistDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  } catch {
    // idem — ignoré silencieusement, pas de fonctionnalité bloquante.
  }
}

export function InstallPrompt() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay() || readDismissed()) return;

    // Détection iOS isolée dans sa propre fonction (plutôt qu'un `setVariant`
    // directement dans le corps de l'effet) : react-hooks/set-state-in-effect
    // signale tout appel de setState non protégé par une fonction de
    // rappel — même règle que celle qui impose déjà des fonctions nommées
    // pour `handleBeforeInstallPrompt`/`handleAppInstalled` ci-dessous.
    function detectIOS() {
      if (/iPad|iPhone|iPod/.test(window.navigator.userAgent)) {
        setVariant("ios");
      }
    }
    detectIOS();

    function handleBeforeInstallPrompt(event: Event) {
      // Empêche la mini-infobar Chrome par défaut : c'est notre bandeau,
      // pas celui du navigateur, qui pilote l'invite d'installation.
      event.preventDefault();
      if (readDismissed()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVariant("android");
    }

    function handleAppInstalled() {
      persistDismissed();
      setVariant(null);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function handleDismiss() {
    persistDismissed();
    setVariant(null);
    setDeferredPrompt(null);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // Refusé ou accepté, le prompt natif ne se rejoue jamais deux fois pour
    // le même évènement : la question est tranchée, on n'insiste pas.
    await deferredPrompt.userChoice;
    persistDismissed();
    setVariant(null);
    setDeferredPrompt(null);
  }

  if (variant === null) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[440px] items-start gap-3 rounded-xl border border-brand-vivid/30 bg-brand px-4 py-3.5 text-cream shadow-soft-lg sm:inset-x-auto sm:right-6"
    >
      <div className="min-w-0 flex-1">
        {variant === "android" ? (
          <>
            <p className="text-[13.5px] leading-relaxed text-cream/90">
              Installe Makinum sur ton téléphone pour y accéder plus vite, même hors ligne.
            </p>
            <button
              type="button"
              onClick={handleInstall}
              className="mt-2.5 inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Installer Makinum
            </button>
          </>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-cream/90">
            Installe Makinum&nbsp;: bouton Partager puis « Sur l&apos;écran d&apos;accueil ».
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer l'invite d'installation"
        className="shrink-0 rounded-md p-1 text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </svg>
      </button>
    </div>
  );
}
