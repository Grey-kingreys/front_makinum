import type { Metadata } from "next";
import { Suspense } from "react";

import { VerificationForm } from "./VerificationForm";

export const metadata: Metadata = { title: "Vérifier mon numéro" };

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationForm />
    </Suspense>
  );
}
