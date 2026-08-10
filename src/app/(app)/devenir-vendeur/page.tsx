import type { Metadata } from "next";

import { AcheteurGuard } from "@/components/app/AcheteurGuard";

import { DevenirVendeurView } from "./DevenirVendeurView";

export const metadata: Metadata = { title: "Devenir vendeur" };

export default function DevenirVendeurPage() {
  return (
    <AcheteurGuard>
      <DevenirVendeurView />
    </AcheteurGuard>
  );
}
