import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { getVendor } from "@/lib/vendors/api";

import { VendeurDetail } from "./VendeurDetail";

interface VendeurPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server Component volontairement fin, même convention que
 * /produits/[id]/page.tsx : va chercher le vendeur et tranche trouvé/404
 * (VENDOR_NOT_FOUND — vendeur inexistant ou suspendu, T39) — le rendu vit
 * dans VendeurDetail (client, interactif). `notFound()` déclenche le
 * `not-found.tsx` colocalisé dans ce même segment de route plutôt que la
 * page 404 générique Next.js. Non testable via `render()` direct pour la
 * même raison que ProduitPage (Server Component async, cf.
 * node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md) : on
 * l'appelle et on `await` sa promesse directement.
 */
export default async function VendeurPage({ params }: VendeurPageProps) {
  const { id } = await params;

  let vendor;
  try {
    vendor = await getVendor(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return <VendeurDetail vendor={vendor} />;
}
