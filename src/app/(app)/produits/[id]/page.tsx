import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { formatPrixGNF } from "@/lib/format";
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
 * Titre keyword-riche (T71) : le prix (en GNF) et « Conakry » apparaissent
 * dans le `<title>` — c'est ce que Google affiche et compare à une requête
 * du type « prix de X en Guinée ». Le template du layout racine (`%s · Makinum`)
 * ajoute la marque automatiquement.
 */
function buildProductTitle(product: ProductView): string {
  return `${product.titre} — ${formatPrixGNF(product.prix)} à Conakry`;
}

/**
 * Description keyword-riche (T71) : commence par le prix (repris tel quel par
 * Google dans le snippet), puis la description produit, puis le vendeur et la
 * mention « paiement à la livraison » — ce dernier segment n'apparaît que si
 * `truncateDescription` (~160 caractères) ne l'a pas déjà coupé.
 */
function buildProductDescription(product: ProductView): string {
  const raw =
    `Prix : ${formatPrixGNF(product.prix)} à Conakry. ${product.description} ` +
    `Vendu par ${product.vendeur.nom}, paiement à la livraison.`;
  return truncateDescription(raw);
}

/**
 * `generateMetadata` (T53, titre/description enrichis en T71) : titre =
 * titre produit + prix + « Conakry », description dérivée du prix puis de la
 * description produit (tronquée ~160 caractères, cf. src/lib/seo/text.ts),
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

  const title = buildProductTitle(product);
  const description = buildProductDescription(product);
  const canonical = `/produits/${id}`;
  const image = product.photos[0]?.url ?? DEFAULT_OG_IMAGE_PATH;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: [{ url: image, alt: product.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Champs `aggregateRating`/`review` du JSON-LD `Product` (T72b, Search
 * Console signalait ces deux champs manquants). Renvoie un objet vide —
 * jamais `aggregateRating`/`review` vides, ce que Google rejette — tant que
 * `avisProduit` est absent (vues produit qui ne l'exposent pas) ou que le
 * produit n'a aucun avis (`nbAvis === 0` implique `noteMoyenne === null` côté
 * backend, mais on vérifie les deux par prudence côté client).
 */
function buildAvisJsonLd(avisProduit: ProductView["avisProduit"]) {
  if (avisProduit === undefined || avisProduit.nbAvis === 0 || avisProduit.noteMoyenne === null) {
    return {};
  }

  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avisProduit.noteMoyenne,
      reviewCount: avisProduit.nbAvis,
      bestRating: 5,
      worstRating: 1,
    },
    review: avisProduit.items.map((item) => ({
      "@type": "Review",
      author: { "@type": "Person", name: item.auteur.nom },
      // `dateCreation` est un horodatage ISO complet (`2026-08-01T00:00:00.000Z`) —
      // `datePublished` n'attend qu'une date, on tronque à la partie avant le `T`.
      datePublished: item.dateCreation.split("T")[0],
      reviewRating: {
        "@type": "Rating",
        ratingValue: item.note,
        bestRating: 5,
        worstRating: 1,
      },
      ...(item.commentaire !== null ? { reviewBody: item.commentaire } : {}),
    })),
  };
}

/**
 * JSON-LD `Product` (schema.org) : prix/devise (GNF) en `offers`, vendeur en
 * `seller`, avis du produit en `aggregateRating`/`review` (T72b, voir
 * `buildAvisJsonLd`). `JsonLd` (src/lib/seo/json-ld.tsx) échappe le JSON avant
 * de l'injecter en `<script>` — indispensable, un titre produit contenant
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
    ...buildAvisJsonLd(product.avisProduit),
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
