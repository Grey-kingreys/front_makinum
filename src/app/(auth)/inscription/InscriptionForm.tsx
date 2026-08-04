"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ApiError, apiFetch } from "@/lib/api";

type RolePublic = "ACHETEUR" | "VENDEUR";

interface RegisterResponse {
  message: string;
}

function describeRegisterError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "PHONE_ALREADY_USED":
        return "Ce numéro de téléphone est déjà utilisé.";
      case "EMAIL_ALREADY_USED":
        return "Cet email est déjà utilisé.";
      case "INVALID_PHONE":
        return "Numéro de téléphone invalide.";
      case "RATE_LIMITED":
        return "Trop de tentatives, réessaie dans un moment.";
      default:
        return error.message || "Une erreur est survenue. Réessaie.";
    }
  }
  return "Une erreur est survenue. Réessaie.";
}

const ROLE_OPTIONS: { value: RolePublic; label: string }[] = [
  { value: "ACHETEUR", label: "Acheteur" },
  { value: "VENDEUR", label: "Devenir vendeur" },
];

export function InscriptionForm() {
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<RolePublic>("ACHETEUR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanNom = nom.trim();
    const cleanTelephone = telephone.trim();
    if (!cleanNom || !cleanTelephone || !motDePasse) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        skipAuth: true,
        body: {
          nom: cleanNom,
          telephone: cleanTelephone,
          motDePasse,
          role,
          email: email.trim() || undefined,
        },
      });
      router.push(`/verification?telephone=${encodeURIComponent(cleanTelephone)}`);
    } catch (err) {
      setError(describeRegisterError(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink">
        Créer un compte
      </h1>
      <p className="mb-6 text-[14.5px] text-brand-subtle">
        Tes informations — un code de vérification suivra par SMS.
      </p>

      {error ? (
        <Alert variant="danger" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[15px]">
        <Input
          label="Nom affiché"
          name="nom"
          autoComplete="name"
          placeholder="Fatoumata Bangoura"
          value={nom}
          onChange={(event) => setNom(event.target.value)}
          required
        />
        <Input
          label="Numéro de téléphone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          placeholder="+224 622 00 00 00"
          value={telephone}
          onChange={(event) => setTelephone(event.target.value)}
          required
        />
        <Input
          label="Email — optionnel, sert à récupérer le compte"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="fatoumata@exemple.gn"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          value={motDePasse}
          onChange={(event) => setMotDePasse(event.target.value)}
          required
        />

        <div>
          <span className="mb-2 block text-[13px] text-brand-muted">Je m&apos;inscris pour</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Rôle du compte">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={role === option.value}
                onClick={() => setRole(option.value)}
                className={cn(
                  "cursor-pointer rounded-md border px-[14px] py-[13px] text-center text-[14px] transition-colors",
                  role === option.value
                    ? "border-brand bg-tint-brand font-medium text-brand-vivid"
                    : "border-border-strong bg-white text-ink hover:border-brand",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting} className="mt-1">
          {submitting ? "Envoi…" : "Recevoir mon code"}
        </Button>
        <p className="text-[12.5px] leading-relaxed text-brand-faint">
          Code envoyé par SMS, une seule fois. Nombre de demandes limité par heure.
        </p>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-brand-subtle">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-brand underline hover:text-accent-strong">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
