import Link from "next/link";

/**
 * 404 racine (T63) : remplace l'écran générique Next (« This page could not
 * be found », en anglais, sans retour possible) pour toute URL non prise en
 * charge par l'application — `app/not-found.tsx` gère à la fois les URLs non
 * appariées à l'échelle de l'app entière et les appels `notFound()` non
 * couverts par un `not-found.tsx` plus spécifique colocalisé sur un segment
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md).
 * Style aligné sur src/app/(app)/vendeurs/[id]/not-found.tsx.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="mb-3 font-display text-[24px] font-bold text-ink">
        Cette page n&apos;existe pas ou n&apos;est plus disponible.
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Vérifie l&apos;adresse ou repars d&apos;ici.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-block rounded-xl bg-brand px-5 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/produits"
          className="inline-block rounded-xl border border-border-strong bg-white px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-brand"
        >
          Voir les produits
        </Link>
      </div>
    </div>
  );
}
