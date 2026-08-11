import type { Metadata } from "next";

import { VendeurGuard } from "@/components/app/VendeurGuard";

import { VendeurParametresView } from "./VendeurParametresView";

export const metadata: Metadata = { title: "Paramètres" };

export default function VendeurParametresPage() {
  return (
    <VendeurGuard>
      <VendeurParametresView />
    </VendeurGuard>
  );
}
