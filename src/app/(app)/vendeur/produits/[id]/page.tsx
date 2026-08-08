import type { Metadata } from "next";

import { VendeurGuard } from "@/components/app/VendeurGuard";

import { EditionProduitView } from "./EditionProduitView";

export const metadata: Metadata = { title: "Modifier mon produit" };

interface EditionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server Component volontairement fin (même convention que
 * (app)/produits/[id]/page.tsx) : résout `params`, délègue tout le reste
 * (fetch, formulaire, photos) à EditionProduitView — client component, seul
 * endroit d'où le jeton de session (en mémoire) est accessible.
 */
export default async function EditionProduitPage({ params }: EditionPageProps) {
  const { id } = await params;
  return (
    <VendeurGuard>
      <EditionProduitView productId={id} />
    </VendeurGuard>
  );
}
