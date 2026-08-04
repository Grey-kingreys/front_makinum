import type { Metadata } from "next";

import { InscriptionForm } from "./InscriptionForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return <InscriptionForm />;
}
