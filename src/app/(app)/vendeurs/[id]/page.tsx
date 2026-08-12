import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { getVendor } from "@/lib/vendors/api";
import type { VendorDetail as VendorDetailData } from "@/lib/vendors/types";
import { DEFAULT_OG_IMAGE_PATH, getSiteUrl } from "@/lib/seo/config";
import { JsonLd } from "@/lib/seo/json-ld";
import { truncateDescription } from "@/lib/seo/text";

import { VendeurDetail } from "./VendeurDetail";

interface VendeurPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Métadonnées de repli quand le vendeur est introuvable ou suspendu (404,
 * VENDOR_NOT_FOUND) : même contrat que ProduitPage — `generateMetadata` ne
 * doit pas planter, elle renvoie un titre neutre et `noindex`.
 */
const NOT_FOUND_METADATA: Metadata = {
  title: "Vendeur introuvable",
  robots: { index: false, follow: false },
};

function describeActivite(vendor: VendorDetailData): string {
  const nbProduits = vendor.nbProduitsActifs;
  const produitsLabel = `${nbProduits} produit${nbProduits > 1 ? "s" : ""} actif${nbProduits > 1 ? "s" : ""}`;
  const noteLabel = vendor.noteMoyenne != null ? `, noté ${vendor.noteMoyenne}/5 (${vendor.nbAvis} avis)` : "";
  return `${vendor.nom} sur Makinum : ${produitsLabel}${noteLabel}. Achats locaux à Conakry, sans intermédiaire.`;
}

/**
 * `generateMetadata` (T53) : titre = nom du vendeur, description dérivée de
 * son activité (nb de produits actifs, note si elle existe — cf.
 * describeActivite), canonique. Pas de photo de vendeur dans le contrat API
 * (VendorDetail) : l'image OG retombe sur l'image par défaut du site plutôt
 * que d'en fabriquer une. Même contrat 404 que ProduitPage.
 */
export async function generateMetadata({ params }: VendeurPageProps): Promise<Metadata> {
  const { id } = await params;

  let vendor: VendorDetailData;
  try {
    vendor = await getVendor(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return NOT_FOUND_METADATA;
    }
    throw error;
  }

  const description = truncateDescription(describeActivite(vendor));
  const canonical = `/vendeurs/${id}`;

  return {
    title: vendor.nom,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: vendor.nom,
      description,
      url: canonical,
      images: [{ url: DEFAULT_OG_IMAGE_PATH, alt: "Makinum" }],
    },
    twitter: {
      card: "summary_large_image",
      title: vendor.nom,
      description,
      images: [DEFAULT_OG_IMAGE_PATH],
    },
  };
}

/**
 * JSON-LD `Store` (schema.org) : `aggregateRating` uniquement si le vendeur a
 * au moins un avis — un `aggregateRating` sans avis est une erreur signalée
 * par Google (Rich Results), donc pas de valeur à zéro par défaut. `JsonLd`
 * (src/lib/seo/json-ld.tsx) échappe le JSON avant injection en `<script>`.
 */
function VendorJsonLd({ vendor }: { vendor: VendorDetailData }) {
  const siteUrl = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: vendor.nom,
    url: `${siteUrl}/vendeurs/${vendor.id}`,
    ...(vendor.nbAvis > 0 && vendor.noteMoyenne != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: vendor.noteMoyenne,
            reviewCount: vendor.nbAvis,
          },
        }
      : {}),
  };

  return <JsonLd data={data} />;
}

/**
 * Server Component volontairement fin, même convention que
 * /produits/[id]/page.tsx : va chercher le vendeur et tranche trouvé/404
 * (VENDOR_NOT_FOUND — vendeur inexistant ou suspendu, T39) — le rendu vit
 * dans VendeurDetail (client, interactif). `notFound()` déclenche le
 * `not-found.tsx` colocalisé dans ce même segment de route plutôt que la
 * page 404 générique Next.js. Non testable via `render()` direct pour la
 * même raison que ProduitPage (Server Component async, cf.
 * node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md) : on
 * l'appelle et on `await` sa promesse directement.
 */
export default async function VendeurPage({ params }: VendeurPageProps) {
  const { id } = await params;

  let vendor;
  try {
    vendor = await getVendor(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <VendorJsonLd vendor={vendor} />
      <VendeurDetail vendor={vendor} />
    </>
  );
}
