import type { Metadata } from "next";

import { VendeurGuard } from "@/components/app/VendeurGuard";

import { VendeurDemandesView } from "./VendeurDemandesView";

export const metadata: Metadata = { title: "Demandes reçues" };

export default function VendeurDemandesPage() {
  return (
    <VendeurGuard>
      <VendeurDemandesView />
    </VendeurGuard>
  );
}
