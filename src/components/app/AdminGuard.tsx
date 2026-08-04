"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

/**
 * Garde d'accès pour les écrans admin (/admin/...) — même construction que
 * VendeurGuard (src/components/app/VendeurGuard.tsx). `AppShell` garantit
 * déjà qu'une session est active (sinon redirection /connexion) ; cette
 * garde ajoute la vérification de rôle : un utilisateur connecté qui n'est
 * pas ADMIN (ACHETEUR, VENDEUR) et navigue directement vers une URL /admin/*
 * est renvoyé vers /produits.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/produits");
    }
  }, [user, router]);

  if (!user || user.role !== "ADMIN") {
    // Pas de flash de contenu admin pendant la redirection.
    return null;
  }

  return <>{children}</>;
}
