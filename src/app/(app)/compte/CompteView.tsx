"use client";

import { useState, type FormEvent } from "react";

import { Alert, Button, Input, PasswordInput } from "@/components/ui";
import { describeUpdateMeFormError, updateMe, useAuth } from "@/lib/auth";
import type { PublicUser } from "@/lib/auth/types";

/**
 * Page « Mon compte » (/compte, T68b) — accessible à TOUS les rôles connectés
 * (ACHETEUR, VENDEUR, ADMIN), sans garde de rôle : protégée uniquement par la
 * garde de session du groupe (app) (AppShell.tsx, redirection /connexion pour
 * un visiteur, /compte n'étant pas dans `PUBLIC_PATH_PREFIXES`). Deux
 * sections indépendantes, chacune avec son propre bouton et son propre état
 * saving/erreur/succès : « Mes informations » (nom, téléphone) et
 * « Mot de passe » — un échec de l'une ne doit pas affecter l'autre.
 *
 * `PATCH /auth/me` (T68a) est le seul point d'entrée pour les deux. Email
 * volontairement en lecture seule : non modifiable en V1 (re-vérification
 * OTP hors périmètre).
 */
export function CompteView() {
  const { user, applyUpdatedUser } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[640px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Mon compte
      </h1>
      <p className="mb-6 text-[14.5px] leading-relaxed text-brand-subtle">
        Tes informations personnelles et ton mot de passe.
      </p>

      <InfosSection user={user} onUpdated={(updated) => applyUpdatedUser(updated)} />
      <MotDePasseSection
        onUpdated={(updated, accessToken) => applyUpdatedUser(updated, accessToken)}
      />
    </div>
  );
}

function InfosSection({
  user,
  onUpdated,
}: {
  user: PublicUser;
  onUpdated: (user: PublicUser) => void;
}) {
  const [nom, setNom] = useState(user.nom);
  const [telephone, setTelephone] = useState(user.telephone ?? "");
  const [nomError, setNomError] = useState<string | null>(null);
  const [telephoneError, setTelephoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const trimmedNom = nom.trim();
  const trimmedTelephone = telephone.trim();
  const currentTelephone = user.telephone ?? "";
  const nomChanged = trimmedNom !== user.nom;
  const telephoneChanged = trimmedTelephone !== currentTelephone;
  const hasChanges = nomChanged || telephoneChanged;

  const phoneHint =
    user.role === "VENDEUR"
      ? "Visible par les acheteurs — c'est ton canal de contact."
      : "Optionnel — sert de canal de contact si tu vends.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;

    if (nomChanged && !trimmedNom) {
      setNomError("Le nom ne peut pas être vide.");
      return;
    }

    setNomError(null);
    setTelephoneError(null);
    setGeneralError(null);
    setJustSaved(false);
    setSaving(true);
    try {
      const { user: updated } = await updateMe({
        ...(nomChanged ? { nom: trimmedNom } : {}),
        ...(telephoneChanged ? { telephone: trimmedTelephone || null } : {}),
      });
      onUpdated(updated);
      setJustSaved(true);
    } catch (err) {
      const { field, message } = describeUpdateMeFormError(err);
      if (field === "telephone") {
        setTelephoneError(message);
      } else {
        setGeneralError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-5">
      <h2 className="text-[16px] font-semibold text-ink">Mes informations</h2>

      {generalError ? (
        <Alert variant="danger" className="mt-4">
          {generalError}
        </Alert>
      ) : null}
      {justSaved ? (
        <Alert variant="success" className="mt-4">
          Modifications enregistrées.
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-[15px]">
        <Input
          label="Email"
          value={user.email ?? ""}
          disabled
          hint="L'email ne peut pas être modifié pour l'instant."
        />
        <Input
          label="Nom"
          name="nom"
          autoComplete="name"
          value={nom}
          onChange={(event) => {
            setNom(event.target.value);
            setNomError(null);
          }}
          error={nomError ?? undefined}
          required
        />
        <Input
          label="Numéro de téléphone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          placeholder="+224 622 00 00 00"
          value={telephone}
          onChange={(event) => {
            setTelephone(event.target.value);
            setTelephoneError(null);
          }}
          error={telephoneError ?? undefined}
          hint={telephoneError ? undefined : phoneHint}
        />

        <Button type="submit" disabled={!hasChanges || saving} aria-busy={saving} className="self-start">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </section>
  );
}

function MotDePasseSection({
  onUpdated,
}: {
  onUpdated: (user: PublicUser, accessToken?: string) => void;
}) {
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [actuelError, setActuelError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actuel || !nouveau || !confirmation) return;

    if (nouveau !== confirmation) {
      setConfirmationError("Les mots de passe ne correspondent pas.");
      return;
    }
    setConfirmationError(null);
    setActuelError(null);
    setGeneralError(null);
    setJustSaved(false);
    setSaving(true);
    try {
      const { user: updated, accessToken } = await updateMe({ motDePasse: { actuel, nouveau } });
      onUpdated(updated, accessToken);
      setActuel("");
      setNouveau("");
      setConfirmation("");
      setJustSaved(true);
    } catch (err) {
      const { field, message } = describeUpdateMeFormError(err);
      if (field === "motDePasseActuel") {
        setActuelError(message);
      } else {
        setGeneralError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-border bg-white p-5">
      <h2 className="text-[16px] font-semibold text-ink">Mot de passe</h2>

      {generalError ? (
        <Alert variant="danger" className="mt-4">
          {generalError}
        </Alert>
      ) : null}
      {justSaved ? (
        <Alert variant="success" className="mt-4">
          Mot de passe mis à jour. Tes autres appareils ont été déconnectés.
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-[15px]">
        <PasswordInput
          label="Mot de passe actuel"
          name="motDePasseActuel"
          autoComplete="current-password"
          placeholder="••••••••"
          value={actuel}
          onChange={(event) => {
            setActuel(event.target.value);
            setActuelError(null);
          }}
          error={actuelError ?? undefined}
          required
        />
        <PasswordInput
          label="Nouveau mot de passe"
          name="nouveauMotDePasse"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          value={nouveau}
          onChange={(event) => {
            setNouveau(event.target.value);
            setConfirmationError(null);
          }}
          required
        />
        <PasswordInput
          label="Confirmer le nouveau mot de passe"
          name="confirmationNouveauMotDePasse"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setConfirmationError(null);
          }}
          error={confirmationError ?? undefined}
          required
        />

        <Button type="submit" disabled={saving} aria-busy={saving} className="self-start">
          {saving ? "Enregistrement…" : "Changer mon mot de passe"}
        </Button>
      </form>
    </section>
  );
}
