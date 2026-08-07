"use client";

import type { ReactNode } from "react";

import { Alert } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/**
 * Layout du groupe vendeur (/vendeur/...) : bandeau permanent « compte en
 * attente de validation » (T30) pour un VENDEUR dont `vendeurValide` est
 * encore `false` — visible sur toutes les pages vendeur (catalogue, demandes
 * reçues, publication/édition de produit) sans dupliquer la logique dans
 * chaque vue. Ton informatif (Alert `neutral`), pas alarmiste : le compte
 * reste utilisable normalement, seule la publication/modification de
 * produits est bloquée côté backend (403 VENDOR_NOT_VALIDATED) tant qu'un
 * administrateur n'a pas validé le compte. Masqué pour un vendeur déjà
 * validé et pour les autres rôles (AppShell garantit déjà une session
 * active avant le montage de ce layout).
 */
export default function VendeurLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pendingValidation = user?.role === "VENDEUR" && user.vendeurValide === false;

  return (
    <div>
      {pendingValidation ? (
        <div className="mx-auto max-w-[1280px] px-6 pt-[18px] sm:px-8 lg:px-10">
          <Alert variant="neutral">
            Ton compte vendeur est en attente de validation par un administrateur. Tu pourras
            publier des produits dès que ton compte sera validé.
          </Alert>
        </div>
      ) : null}
      {children}
    </div>
  );
}
