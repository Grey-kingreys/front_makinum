import type { Metadata } from "next";
import { Suspense } from "react";

import { GoogleCallback } from "./GoogleCallback";

export const metadata: Metadata = { title: "Connexion avec Google" };

export default function ConnexionGooglePage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallback />
    </Suspense>
  );
}
