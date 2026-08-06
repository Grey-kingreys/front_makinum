import type { Metadata } from "next";

import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return <DashboardView />;
}
