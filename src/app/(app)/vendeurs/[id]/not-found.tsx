import Link from "next/link";

/**
 * UI « vendeur introuvable » colocalisée sur ce segment de route
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md) :
 * rendue quand VendeurPage appelle `notFound()` (vendeur inexistant ou
 * suspendu — VENDOR_NOT_FOUND, T39), à la place de la page 404 générique
 * Next.js.
 */
export default function VendeurNotFound() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <h1 className="mb-3 font-display text-[24px] font-bold text-ink">Vendeur introuvable</h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Ce vendeur n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/vendeurs"
        className="inline-block rounded-xl bg-brand px-5 py-3 text-[14.5px] font-semibold text-cream transition-colors hover:bg-brand-vivid"
      >
        Voir tous les vendeurs
      </Link>
    </div>
  );
}
