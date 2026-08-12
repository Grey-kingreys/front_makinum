import type { Metadata } from "next";
import { Suspense } from "react";

import { VerificationForm } from "./VerificationForm";

// T53 : ceinture et bretelles avec le Disallow du robots.txt (src/app/robots.ts).
export const metadata: Metadata = {
  title: "Vérifier mon email",
  robots: { index: false, follow: false },
};

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationForm />
    </Suspense>
  );
}
