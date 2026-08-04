"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

/**
 * Garde d'accès pour les écrans vendeur (/vendeur/...). `AppShell` garantit
 * déjà qu'une session est active avant de rendre le contenu de page (sinon
 * redirection /connexion) — cette garde ajoute la vérification de rôle :
 * un utilisateur connecté qui n'est pas VENDEUR (ACHETEUR, ADMIN) et navigue
 * directement vers une URL /vendeur/* est renvoyé vers /produits.
 */
export function VendeurGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role !== "VENDEUR") {
      router.replace("/produits");
    }
  }, [user, router]);

  if (!user || user.role !== "VENDEUR") {
    // Pas de flash de contenu vendeur pendant la redirection.
    return null;
  }

  return <>{children}</>;
}
