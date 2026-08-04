import type { Metadata } from "next";

import { DemandesView } from "./DemandesView";

export const metadata: Metadata = { title: "Ma demande d'achat" };

export default function DemandesPage() {
  return <DemandesView />;
}
