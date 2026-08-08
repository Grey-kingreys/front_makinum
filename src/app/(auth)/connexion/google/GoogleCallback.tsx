"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert, type AlertVariant } from "@/components/ui";
import { refreshSession } from "@/lib/api";

/**
 * Codes d'erreur possibles en query param `erreur`, posés par le backend sur
 * `<FRONTEND_URL>/connexion/google?erreur=<code>` (voir
 * `GET /auth/google/callback`). `refus` n'est pas un échec technique —
 * l'utilisateur a simplement refusé le consentement — le ton du message le
 * reflète (variante neutre plutôt que danger).
 */
type ErrorCode = "refus" | "email_non_verifie" | "compte_suspendu" | "google";

interface ErrorInfo {
  variant: AlertVariant;
  message: string;
}

const ERROR_MESSAGES: Record<ErrorCode, ErrorInfo> = {
  refus: {
    variant: "neutral",
    message:
      "Connexion annulée : tu as refusé l'accès à ton compte Google. Aucun souci, réessaie quand tu veux ou connecte-toi avec ton email.",
  },
  email_non_verifie: {
    variant: "danger",
    message:
      "L'adresse email de ce compte Google n'est pas vérifiée. Vérifie-la du côté de Google avant de réessayer.",
  },
  // Même formulation que /connexion pour ACCOUNT_SUSPENDED (voir ConnexionForm).
  compte_suspendu: {
    variant: "danger",
    message: "Ce compte est suspendu. Contacte l'équipe Makinum pour plus d'informations.",
  },
  google: {
    variant: "danger",
    message: "La connexion avec Google a échoué (problème technique). Réessaie.",
  },
};

function describeError(code: string): ErrorInfo {
  return code in ERROR_MESSAGES ? ERROR_MESSAGES[code as ErrorCode] : ERROR_MESSAGES.google;
}

/**
 * Page d'atterrissage du retour Google (T29) — `<FRONTEND_URL>/connexion/google`.
 *
 * Sans `?erreur=` : le backend vient de poser le cookie de rafraîchissement,
 * on appelle `POST /auth/refresh` (via {@link refreshSession}, le même
 * mécanisme que la restauration de session au montage de l'`AuthProvider` —
 * rien de réimplémenté) puis on redirige vers `/dashboard`. Un échec de ce
 * rafraîchissement sans erreur annoncée est traité comme le code `google`.
 *
 * Avec `?erreur=<code>` : le cookie n'a pas été posé, aucun rafraîchissement
 * n'est tenté — on affiche directement le message correspondant.
 */
export function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const erreur = searchParams.get("erreur");
  const [failureCode, setFailureCode] = useState<string | null>(erreur);
  // Garde contre un second déclenchement de l'effet (identité de `router`
  // instable selon l'implémentation de next/navigation) : le rafraîchissement
  // ne doit être tenté qu'une seule fois par atterrissage sur la page.
  const startedRef = useRef(false);

  useEffect(() => {
    if (erreur || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    refreshSession()
      .then(() => {
        if (!cancelled) router.replace("/dashboard");
      })
      .catch(() => {
        if (!cancelled) setFailureCode("google");
      });
    return () => {
      cancelled = true;
    };
  }, [erreur, router]);

  if (!failureCode) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-2 border-border-strong border-t-brand"
        />
        <p className="text-[14px] text-brand-subtle">Connexion avec Google en cours…</p>
      </div>
    );
  }

  const info = describeError(failureCode);

  return (
    <div>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
        Connexion avec Google
      </h1>
      <Alert variant={info.variant} className="mb-5">
        {info.message}
      </Alert>
      <Link
        href="/connexion"
        className="text-[14px] font-medium text-brand underline hover:text-accent-strong"
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
