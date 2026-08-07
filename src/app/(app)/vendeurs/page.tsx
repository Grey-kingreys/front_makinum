import type { Metadata } from "next";

import { VendeursView } from "./VendeursView";

export const metadata: Metadata = { title: "Vendeurs" };

export default function VendeursPage() {
  return <VendeursView />;
}
