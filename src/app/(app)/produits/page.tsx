import type { Metadata } from "next";
import { Suspense } from "react";

import { ProduitsView } from "./ProduitsView";

// T71 : titre/description keyword-riches — « Conakry », « prix en GNF » —
// pour qu'une recherche « site de vente en ligne en Guinée » fasse remonter
// cette page. ProduitsView (client) fait le rendu ; ce segment reste un
// Server Component pour pouvoir exporter `metadata`.
export const metadata: Metadata = {
  title: "Produits à vendre à Conakry — prix en GNF",
  description:
    "Parcours les produits en vente près de chez toi à Conakry, en Guinée : prix affichés en GNF, " +
    "triés par distance, contact direct avec le vendeur et paiement à la livraison.",
};

export default function ProduitsPage() {
  return (
    <Suspense fallback={null}>
      <ProduitsView />
    </Suspense>
  );
}
