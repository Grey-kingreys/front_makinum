import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminGuard } from "@/components/app/AdminGuard";

import { VendeursView } from "./VendeursView";

export const metadata: Metadata = { title: "Vendeurs" };

export default function VendeursPage() {
  return (
    <AdminGuard>
      <Suspense fallback={null}>
        <VendeursView />
      </Suspense>
    </AdminGuard>
  );
}
