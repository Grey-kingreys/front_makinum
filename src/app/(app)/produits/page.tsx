import type { Metadata } from "next";
import { Suspense } from "react";

import { ProduitsView } from "./ProduitsView";

export const metadata: Metadata = { title: "Produits proches" };

export default function ProduitsPage() {
  return (
    <Suspense fallback={null}>
      <ProduitsView />
    </Suspense>
  );
}
