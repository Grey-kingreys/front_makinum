import Link from "next/link";

import { ProductCard } from "@/components/products/ProductCard";
import { searchProductsCached } from "@/lib/products/api";
import type { ProductSearchItem } from "@/lib/products/types";

/**
 * Section produits de la landing (T58) — alimentée par GET /products?limit=8
 * (public depuis T51) en fetch server-side avec revalidation 5 min
 * (`next: { revalidate: 300 }`), même motif que CategoryGrid. Sans
 * `lat`/`lng`, l'API retombe sur le tri RECENT (pas d'erreur) : cette
 * section montre donc les annonces les plus récentes.
 *
 * Contrairement aux catégories, il n'existe pas de repli statique sensé pour
 * des produits : si l'appel échoue OU renvoie une liste vide, la section
 * entière est masquée (pas de grille vide, pas de faux contenu) — la landing
 * ne doit jamais planter à cause de cette section.
 *
 * La position du visiteur est toujours inconnue en rendu serveur : les
 * cartes passent `showDistance={false}` pour ne jamais afficher à tort
 * « Localisation non précisée » sur 100 % des produits (voir ProductCard).
 */

const FEATURED_PRODUCTS_LIMIT = 8;

async function loadFeaturedProducts(): Promise<ProductSearchItem[]> {
  try {
    const result = await searchProductsCached({ limit: FEATURED_PRODUCTS_LIMIT });
    return result.items;
  } catch {
    return [];
  }
}

export async function FeaturedProducts() {
  const products = await loadFeaturedProducts();

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="featured-products-heading"
      className="border-t border-border bg-white px-6 py-16 sm:px-8 lg:px-12 lg:py-[76px]"
    >
      <div className="mx-auto max-w-[1240px]">
        <h2
          id="featured-products-heading"
          className="mb-2.5 font-display text-[28px] font-bold tracking-[-0.03em] sm:text-[34px]"
        >
          Les dernières annonces
        </h2>
        <p className="mb-8 max-w-[560px] text-[15px] leading-[1.6] text-brand-subtle">
          Un aperçu des produits publiés récemment sur Makinum. Partage ta position sur la page
          produits pour les trier par distance.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((item) => (
            <ProductCard key={item.id} item={item} showDistance={false} />
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/produits"
            className="inline-flex items-center justify-center rounded-lg border border-border-strong px-6 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-brand"
          >
            Voir tous les produits
          </Link>
        </div>
      </div>
    </section>
  );
}
