import type { Metadata } from "next";

import { AdminGuard } from "@/components/app/AdminGuard";

import { VendeursView } from "./VendeursView";

export const metadata: Metadata = { title: "Vendeurs" };

export default function VendeursPage() {
  return (
    <AdminGuard>
      <VendeursView />
    </AdminGuard>
  );
}
