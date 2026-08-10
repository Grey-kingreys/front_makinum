"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

/**
 * Garde d'accès pour les écrans réservés aux acheteurs (T48b : /devenir-vendeur
 * — « devenir vendeur » n'a de sens que pour un compte ACHETEUR). Même
 * construction que VendeurGuard/AdminGuard (src/components/app/VendeurGuard.tsx,
 * AdminGuard.tsx), à l'exception de la destination de repli : ici /dashboard
 * (spec T48b), pas /produits — un VENDEUR ou un ADMIN qui atterrit sur cette
 * page n'a rien à y faire, mais le tableau de bord reste la page d'accueil
 * naturelle de tout rôle. `AppShell` garantit déjà qu'une session est active
 * avant le montage de cette garde.
 */
export function AcheteurGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role !== "ACHETEUR") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "ACHETEUR") {
    // Pas de flash de contenu réservé pendant la redirection.
    return null;
  }

  return <>{children}</>;
}
