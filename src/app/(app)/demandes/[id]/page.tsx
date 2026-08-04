import type { Metadata } from "next";

import { DemandeDetailView } from "./DemandeDetailView";

export const metadata: Metadata = { title: "Ma demande" };

interface DemandePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server Component volontairement fin (même convention que
 * ../../vendeur/produits/[id]/page.tsx) : résout `params`, délègue le fetch
 * (authentifié, donc client-side) à DemandeDetailView.
 */
export default async function DemandePage({ params }: DemandePageProps) {
  const { id } = await params;
  return <DemandeDetailView demandeId={id} />;
}
