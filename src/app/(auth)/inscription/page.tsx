import type { Metadata } from "next";
import { Suspense } from "react";

import { InscriptionForm } from "./InscriptionForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}
