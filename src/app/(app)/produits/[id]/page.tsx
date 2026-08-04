import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { getProduct } from "@/lib/products/api";

import { ProductDetail } from "./ProductDetail";

interface ProduitPageProps {
  params: Promise<{ id: string }>;
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

  return <ProductDetail product={product} />;
}
