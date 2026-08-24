"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Limite d'erreur racine (T63) : remplace l'écran technique par défaut
 * (« Application error… ») affiché quand une exception non rattrapée
 * survient pendant le rendu d'un segment de route. Wrappe `page.tsx`,
 * `layout.tsx` imbriqués, `loading.tsx` et `not-found.tsx`, mais pas le
 * layout racine lui-même — pour ça, voir `global-error.tsx`
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
 *
 * Aucun détail technique (message d'erreur, stack) n'est affiché au public —
 * le public cible n'est pas technicien. `error` n'est journalisé qu'en
 * console, pour l'outillage d'observabilité éventuel.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="mb-3 font-display text-[24px] font-bold text-ink">
        Un problème est survenu.
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">Réessaie.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-block cursor-pointer rounded-xl bg-brand px-5 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="inline-block rounded-xl border border-border-strong bg-white px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-brand"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
