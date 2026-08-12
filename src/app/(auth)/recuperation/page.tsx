import type { Metadata } from "next";

import { RecuperationForm } from "./RecuperationForm";

// T53 : ceinture et bretelles avec le Disallow du robots.txt (src/app/robots.ts).
export const metadata: Metadata = {
  title: "Récupérer mon compte",
  robots: { index: false, follow: false },
};

export default function RecuperationPage() {
  return <RecuperationForm />;
}
