import type { Metadata } from "next";

import { VendeurGuard } from "@/components/app/VendeurGuard";

import { CatalogueView } from "./CatalogueView";

export const metadata: Metadata = { title: "Mon catalogue" };

export default function CataloguePage() {
  return (
    <VendeurGuard>
      <CatalogueView />
    </VendeurGuard>
  );
}
