"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** Query param déposé par /recuperation à la fin de la réinitialisation. */
const RECOVERY_SUCCESS_PARAM = "recupere";

interface LoginErrorInfo {
  message: string;
  /** INVALID_CREDENTIALS/EMAIL_NOT_VERIFIED : propose un lien vers /verification. */
  showVerifyLink: boolean;
}

function describeLoginError(error: unknown): LoginErrorInfo {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_CREDENTIALS":
        return { message: "Identifiant ou mot de passe incorrect.", showVerifyLink: false };
      case "EMAIL_NOT_VERIFIED":
        return {
          message: "Adresse email non vérifiée : valide le code reçu par email pour te connecter.",
          showVerifyLink: true,
        };
      case "ACCOUNT_SUSPENDED":
        return {
          message: "Ce compte est suspendu. Contacte l'équipe Makinum pour plus d'informations.",
          showVerifyLink: false,
        };
      case "RATE_LIMITED":
        return { message: "Trop de tentatives, réessaie dans un moment.", showVerifyLink: false };
      default:
        return {
          message: error.message || "Une erreur est survenue. Réessaie.",
          showVerifyLink: false,
        };
    }
  }
  return { message: "Une erreur est survenue. Réessaie.", showVerifyLink: false };
}

export function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login } = useAuth();

  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginErrorInfo | null>(null);

  const recoverySuccess = searchParams.get(RECOVERY_SUCCESS_PARAM) === "1";

  // Déjà connecté (session restaurée par l'AuthProvider) : direction /dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanIdentifiant = identifiant.trim();
    if (!cleanIdentifiant || !motDePasse) return;

    setSubmitting(true);
    setError(null);
    try {
      await login(cleanIdentifiant, motDePasse);
      router.push("/dashboard");
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
        Se connecter
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">Avec ton email ou ton numéro vérifié.</p>

      {recoverySuccess ? (
        <Alert variant="success" className="mb-5">
          Mot de passe mis à jour. Connecte-toi avec ton nouveau mot de passe.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" className="mb-5">
          <span>{error.message}</span>
          {error.showVerifyLink ? (
            <>
              {" "}
              <Link
                href={`/verification?email=${encodeURIComponent(identifiant.trim())}`}
                className="font-medium underline"
              >
                Vérifier mon email
              </Link>
            </>
          ) : null}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <Input
          label="Email ou numéro vérifié"
          name="identifiant"
          autoComplete="username"
          placeholder="fatoumata@exemple.gn"
          value={identifiant}
          onChange={(event) => setIdentifiant(event.target.value)}
          required
        />
        <Input
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={motDePasse}
          onChange={(event) => setMotDePasse(event.target.value)}
          required
        />
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-4 text-right text-[13px]">
        <Link href="/recuperation" className="text-brand-subtle underline hover:text-brand-vivid">
          Mot de passe oublié ?
        </Link>
      </p>

      <p className="mt-6 text-center text-[13.5px] text-brand-subtle">
        Pas de compte ?{" "}
        <Link href="/inscription" className="text-brand underline hover:text-accent-strong">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
