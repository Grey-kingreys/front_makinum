import type { Metadata } from "next";

import { VendeursView } from "./VendeursView";

// T71 : titre/description keyword-riches, même logique que /produits.
export const metadata: Metadata = {
  title: "Vendeurs locaux à Conakry, Guinée",
  description:
    "Découvre les vendeurs locaux de Makinum à Conakry, en Guinée : statut de confiance, avis " +
    "d'acheteurs et contact direct pour acheter en ligne près de chez toi.",
};

export default function VendeursPage() {
  return <VendeursView />;
}
