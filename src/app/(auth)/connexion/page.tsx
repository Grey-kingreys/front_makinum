import type { Metadata } from "next";
import { Suspense } from "react";

import { ConnexionForm } from "./ConnexionForm";

// T53 : ceinture et bretelles avec le Disallow du robots.txt (src/app/robots.ts) —
// une page d'auth n'a aucune valeur en index de recherche.
export const metadata: Metadata = { title: "Se connecter", robots: { index: false, follow: false } };

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}
