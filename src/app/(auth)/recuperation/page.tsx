import type { Metadata } from "next";

import { RecuperationForm } from "./RecuperationForm";

export const metadata: Metadata = { title: "Récupérer mon compte" };

export default function RecuperationPage() {
  return <RecuperationForm />;
}
