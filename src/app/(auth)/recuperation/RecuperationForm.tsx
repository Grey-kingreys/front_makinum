"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, Button, Input, PasswordInput } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface MessageResponse {
  message: string;
}

type Step = "identifiant" | "code";

function describeRecoveryError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "INVALID_OTP":
        return "Code invalide ou expiré.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      default:
        return error.message || "Une erreur est survenue. Réessaie.";
    }
  }
  return "Une erreur est survenue. Réessaie.";
}

export function RecuperationForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("identifiant");
  const [identifiant, setIdentifiant] = useState("");
  const [code, setCode] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  // Déjà connecté (session restaurée par l'AuthProvider) : direction /dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanIdentifiant = identifiant.trim();
    if (!cleanIdentifiant) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch<MessageResponse>("/auth/recovery/request", {
        method: "POST",
        skipAuth: true,
        body: { identifiant: cleanIdentifiant },
      });
      setInfoMessage(response.message);
      setStep("code");
    } catch (err) {
      setError(describeRecoveryError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode || !nouveauMotDePasse) return;

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setConfirmationError("Les mots de passe ne correspondent pas.");
      return;
    }
    setConfirmationError(null);

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<MessageResponse>("/auth/recovery/reset", {
        method: "POST",
        skipAuth: true,
        body: {
          identifiant: identifiant.trim(),
          code: cleanCode,
          nouveauMotDePasse,
        },
      });
      router.push("/connexion?recupere=1");
    } catch (err) {
      setError(describeRecoveryError(err));
      setSubmitting(false);
    }
  }

  function handleBack() {
    setStep("identifiant");
    setCode("");
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setConfirmationError(null);
    setError(null);
    setInfoMessage(null);
  }

  if (step === "code") {
    return (
      <div>
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
          Nouveau mot de passe
        </h1>
        <p className="mb-6 text-[14.5px] text-brand-subtle">
          Code à 6 chiffres envoyé par email si le compte existe, et nouveau mot de passe.
        </p>

        {infoMessage ? (
          <Alert variant="neutral" className="mb-5">
            {infoMessage}
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="danger" className="mb-5">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={handleReset} className="flex flex-col gap-[14px]">
          <Input
            label="Code reçu"
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <PasswordInput
            label="Nouveau mot de passe"
            name="nouveauMotDePasse"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            value={nouveauMotDePasse}
            onChange={(event) => {
              setNouveauMotDePasse(event.target.value);
              setConfirmationError(null);
            }}
            required
          />
          <PasswordInput
            label="Confirmer le nouveau mot de passe"
            name="confirmationMotDePasse"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            value={confirmationMotDePasse}
            onChange={(event) => {
              setConfirmationMotDePasse(event.target.value);
              setConfirmationError(null);
            }}
            error={confirmationError ?? undefined}
            required
          />
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Validation…" : "Réinitialiser le mot de passe"}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleBack}
          className="mt-4 w-full cursor-pointer text-center text-[13px] text-brand-subtle underline"
        >
          Modifier mon identifiant
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
        Récupérer mon compte
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Indique ton email (ou ton numéro vérifié) pour recevoir un code de réinitialisation.
      </p>

      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleRequest} className="flex flex-col gap-[14px]">
        <Input
          label="Email"
          name="identifiant"
          autoComplete="username"
          placeholder="fatoumata@exemple.gn"
          value={identifiant}
          onChange={(event) => setIdentifiant(event.target.value)}
          required
        />
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Envoi…" : "Recevoir le code"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-brand-subtle">
        <Link href="/connexion" className="text-brand underline hover:text-accent-strong">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
