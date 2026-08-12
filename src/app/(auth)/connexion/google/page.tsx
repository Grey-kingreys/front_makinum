import type { Metadata } from "next";
import { Suspense } from "react";

import { GoogleCallback } from "./GoogleCallback";

// T53 : ceinture et bretelles avec le Disallow du robots.txt (src/app/robots.ts).
export const metadata: Metadata = {
  title: "Connexion avec Google",
  robots: { index: false, follow: false },
};

export default function ConnexionGooglePage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallback />
    </Suspense>
  );
}
