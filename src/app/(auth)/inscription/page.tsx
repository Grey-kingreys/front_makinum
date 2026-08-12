import type { Metadata } from "next";
import { Suspense } from "react";

import { InscriptionForm } from "./InscriptionForm";

// T53 : ceinture et bretelles avec le Disallow du robots.txt (src/app/robots.ts).
export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: false } };

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}
