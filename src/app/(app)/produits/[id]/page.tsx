import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { getProduct } from "@/lib/products/api";
import type { ProductView } from "@/lib/products/types";
import { DEFAULT_OG_IMAGE_PATH, getSiteUrl } from "@/lib/seo/config";
import { JsonLd } from "@/lib/seo/json-ld";
import { truncateDescription } from "@/lib/seo/text";

import { ProductDetail } from "./ProductDetail";

interface ProduitPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Métadonnées de repli quand le produit est introuvable (404) : la page
 * elle-même déclenche `notFound()` au rendu (voir plus bas) — `generateMetadata`
 * ne doit pas planter pour autant, elle renvoie juste un titre neutre et
 * `noindex` plutôt que de propager l'erreur.
 */
const NOT_FOUND_METADATA: Metadata = {
  title: "Produit introuvable",
  robots: { index: false, follow: false },
};

/**
 * `generateMetadata` (T53) : titre = titre produit, description dérivée de
 * la description produit (tronquée ~160 caractères, cf. src/lib/seo/text.ts),
 * image OG = première photo si elle existe (les URLs backend sont déjà
 * absolues — pas besoin de les recomposer avec metadataBase), sinon repli sur
 * l'image par défaut du site. Même contrat d'erreur que la page : un 404
 * ApiError est absorbé (repli ci-dessus), toute autre erreur est propagée.
 */
export async function generateMetadata({ params }: ProduitPageProps): Promise<Metadata> {
  const { id } = await params;

  let product: ProductView;
  try {
    product = await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return NOT_FOUND_METADATA;
    }
    throw error;
  }

  const description = truncateDescription(product.description);
  const canonical = `/produits/${id}`;
  const image = product.photos[0]?.url ?? DEFAULT_OG_IMAGE_PATH;

  return {
    title: product.titre,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.titre,
      description,
      url: canonical,
      images: [{ url: image, alt: product.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.titre,
      description,
      images: [image],
    },
  };
}

/**
 * JSON-LD `Product` (schema.org) : prix/devise (GNF) en `offers`, vendeur en
 * `seller`. `JsonLd` (src/lib/seo/json-ld.tsx) échappe le JSON avant de
 * l'injecter en `<script>` — indispensable, un titre produit contenant
 * `</script>` ne doit pas pouvoir casser la page.
 */
function ProductJsonLd({ product }: { product: ProductView }) {
  const siteUrl = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.titre,
    description: product.description,
    ...(product.photos.length > 0 ? { image: product.photos.map((photo) => photo.url) } : {}),
    offers: {
      "@type": "Offer",
      price: product.prix,
      priceCurrency: "GNF",
      availability: product.actif ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/produits/${product.id}`,
    },
    seller: {
      "@type": "Organization",
      name: product.vendeur.nom,
      url: `${siteUrl}/vendeurs/${product.vendeurId}`,
    },
  };

  return <JsonLd data={data} />;
}

/**
 * Server Component volontairement fin : la seule responsabilité ici est
 * d'aller chercher le produit et de trancher trouvé/404 — le rendu (galerie,
 * distance, boutons contact) vit dans ProductDetail (client, interactif).
 * Next.js ne supporte pas le rendu des Server Components async par
 * Vitest/RTL (cf. node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md) —
 * cette fonction reste donc testable en l'appelant directement (elle renvoie
 * une simple Promise<ReactElement>), sans passer par `render()`.
 */
export default async function ProduitPage({ params }: ProduitPageProps) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <ProductJsonLd product={product} />
      <ProductDetail product={product} />
    </>
  );
}
