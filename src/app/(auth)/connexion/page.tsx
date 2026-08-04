import type { Metadata } from "next";
import { Suspense } from "react";

import { ConnexionForm } from "./ConnexionForm";

export const metadata: Metadata = { title: "Se connecter" };

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}
