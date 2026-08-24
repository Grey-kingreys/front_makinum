"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Capture partagée de l'évènement `beforeinstallprompt` (T70, remplace la
 * capture locale à `InstallPrompt` de T67②).
 *
 * Le bandeau T67② captait l'évènement dans son propre `useEffect` : il ne
 * pouvait donc servir qu'à *ce* composant, monté au bon moment. Le bouton
 * d'installation de la sidebar (T70) a un besoin différent — l'évènement
 * fire tôt (souvent avant même que l'utilisateur n'ouvre la sidebar) et une
 * seule fois par session de navigation, mais doit rester disponible plus
 * tard, à un clic arbitraire, potentiellement dans une instance de sidebar
 * différente de celle qui était montée au moment du fire (navigation,
 * remount mobile/desktop, etc.).
 *
 * Solution : écouteur enregistré une seule fois **au niveau module** (donc
 * dès le premier import, indépendamment de tout montage de composant),
 * évènement mémorisé dans une variable de module, et un petit pub/sub pour
 * notifier les instances de `useInstallPrompt()` actuellement montées
 * lorsque l'état change (nouvel évènement, consommation, installation).
 */

/** Évènement non encore standardisé dans lib.dom.d.ts (Chrome/Chromium uniquement). */
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

type Listener = () => void;

let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function handleBeforeInstallPrompt(event: Event): void {
  // Empêche la mini-infobar Chrome par défaut : c'est notre propre UI (bouton
  // sidebar), pas celle du navigateur, qui pilote l'invite d'installation.
  event.preventDefault();
  deferredEvent = event as BeforeInstallPromptEvent;
  notify();
}

function handleAppInstalled(): void {
  // Installée (par notre bouton ou par un autre chemin, ex. menu navigateur) :
  // plus rien à proposer, l'évènement — de toute façon périmé — est oublié.
  deferredEvent = null;
  notify();
}

// Garde SSR : ce module est importé aussi bien côté serveur (build Next.js)
// que client — `window` n'existe que côté client. Enregistrement une seule
// fois par cycle de vie du module (pas dans un effet, pas par composant).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
}

function isIOSUserAgent(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  // `matchMedia` est absent de certains environnements (anciens WebView,
  // jsdom en test) : on le traite comme « pas standalone » plutôt que de
  // planter le rendu.
  const displayModeStandalone =
    typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}

export interface UseInstallPromptResult {
  /** Vrai si un évènement `beforeinstallprompt` est en attente (Chrome/Android). */
  canPrompt: boolean;
  /** Déclenche l'invite native puis consomme l'évènement (no-op si `canPrompt` est faux). */
  promptInstall: () => Promise<void>;
  /** UA iOS (Safari n'émet jamais `beforeinstallprompt` — pas d'invite programmatique possible). */
  isIOS: boolean;
  /** Déjà lancée en mode application (standalone) — rien à proposer. */
  isStandalone: boolean;
}

export function useInstallPrompt(): UseInstallPromptResult {
  // Valeur initiale calculée côté serveur comme côté client avant tout effet
  // (`false`/`deferredEvent === null` dans les deux cas au premier rendu tant
  // qu'aucun effet n'a tourné) : pas de mismatch d'hydratation. `isIOS` et
  // `isStandalone` dépendent de l'UA/`matchMedia`, indisponibles côté serveur
  // — même parti pris que l'ancien `InstallPrompt` (détection reportée à un
  // effet plutôt que lue directement dans le corps du rendu).
  const [canPrompt, setCanPrompt] = useState(() => deferredEvent !== null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // `react-hooks/set-state-in-effect` interdit d'appeler setState
    // directement dans le corps de l'effet (même règle que l'ancien
    // `InstallPrompt` de T67②, cf. son `detectIOS()`) : chaque mise à jour
    // est isolée dans sa propre fonction nommée plutôt qu'inlinée.
    function detectPlatform() {
      setIsIOS(isIOSUserAgent());
      setIsStandalone(isStandaloneDisplay());
    }
    detectPlatform();

    function syncCanPrompt() {
      setCanPrompt(deferredEvent !== null);
    }
    // Resynchronise immédiatement : l'évènement a pu arriver entre le rendu
    // initial et ce montage d'effet.
    syncCanPrompt();
    listeners.add(syncCanPrompt);
    return () => {
      listeners.delete(syncCanPrompt);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return;
    const event = deferredEvent;
    await event.prompt();
    // Refusé ou accepté, le prompt natif ne se rejoue jamais deux fois pour
    // le même évènement : la question est tranchée, on n'insiste pas.
    await event.userChoice;
    deferredEvent = null;
    notify();
  }, []);

  return { canPrompt, promptInstall, isIOS, isStandalone };
}
