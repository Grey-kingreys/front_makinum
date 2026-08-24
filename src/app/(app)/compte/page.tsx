import type { Metadata } from "next";

import { CompteView } from "./CompteView";

export const metadata: Metadata = { title: "Mon compte" };

export default function ComptePage() {
  return <CompteView />;
}
