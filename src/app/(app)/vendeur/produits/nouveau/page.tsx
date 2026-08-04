import type { Metadata } from "next";

import { VendeurGuard } from "@/components/app/VendeurGuard";

import { NouveauProduitForm } from "./NouveauProduitForm";

export const metadata: Metadata = { title: "Publier un produit" };

export default function NouveauProduitPage() {
  return (
    <VendeurGuard>
      <NouveauProduitForm />
    </VendeurGuard>
  );
}
