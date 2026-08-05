"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api";

/** Délai avant redirection vers /connexion, le temps que le message soit lu. */
const REDIRECT_DELAY_MS = 900;

interface MessageResponse {
  message: string;
}

function describeOtpError(error: unknown): string {
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

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim();
    if (!email || cleanCode.length !== 6) return;

    setVerifying(true);
    setError(null);
    setResendMessage(null);
    try {
      const response = await apiFetch<MessageResponse>("/auth/otp/verify-email", {
        method: "POST",
        skipAuth: true,
        body: { email, code: cleanCode },
      });
      setSuccessMessage(response.message);
      redirectTimer.current = setTimeout(() => {
        router.push("/connexion");
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(describeOtpError(err));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    try {
      const response = await apiFetch<MessageResponse>("/auth/otp/request", {
        method: "POST",
        skipAuth: true,
        body: { email, usage: "VERIFY_EMAIL" },
      });
      setResendMessage(response.message);
    } catch (err) {
      setError(describeOtpError(err));
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <div>
        <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
          Vérifie ton email
        </h1>
        <Alert variant="danger" className="mb-5">
          Email manquant. Retourne à{" "}
          <Link href="/inscription" className="font-medium underline">
            l&apos;inscription
          </Link>{" "}
          ou à la{" "}
          <Link href="/connexion" className="font-medium underline">
            connexion
          </Link>
          .
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
        Vérifie ton email
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Code à 6 chiffres envoyé par email à {email}.
      </p>

      {successMessage ? (
        <Alert variant="success" className="mb-5">
          {successMessage}
        </Alert>
      ) : null}
      {resendMessage ? (
        <Alert variant="neutral" className="mb-5">
          {resendMessage}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleVerify} className="flex flex-col gap-[14px]">
        <Input
          label="Code reçu par email"
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
        <Button type="submit" size="lg" disabled={verifying} aria-busy={verifying}>
          {verifying ? "Vérification…" : "Valider le code"}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending}
        aria-busy={resending}
        className="mt-4 w-full cursor-pointer text-center text-[13px] text-brand-subtle underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {resending ? "Envoi…" : "Renvoyer le code"}
      </button>
    </div>
  );
}
