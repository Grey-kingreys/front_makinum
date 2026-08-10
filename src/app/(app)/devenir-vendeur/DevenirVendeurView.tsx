"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, ConfirmDialog, Input } from "@/components/ui";
import { describeDevenirVendeurFormError, devenirVendeur, useAuth } from "@/lib/auth";

/**
 * Page « Devenir vendeur » (/devenir-vendeur, T48b) — chemin libre-service
 * acheteur vers `POST /auth/devenir-vendeur` (T48a). Réservée ACHETEUR par
 * AcheteurGuard (src/components/app/AcheteurGuard.tsx, redirection /dashboard
 * pour les autres rôles) — ce composant peut donc supposer `user.role ===
 * "ACHETEUR"`.
 *
 * Le téléphone n'est demandé que si le compte n'en a pas déjà un
 * (`user.telephone === null`) — même sémantique que la modale d'envoi de
 * demande (T36, DemandeCard.tsx) : requis seulement dans ce cas, sinon
 * silencieusement ignoré par le backend. ConfirmDialog (T35) nomme la
 * conséquence avant l'appel : le rôle passe VENDEUR immédiatement, la
 * publication de produits reste bloquée (403 VENDOR_NOT_VALIDATED) tant
 * qu'un administrateur n'a pas validé le compte (bandeau T30 existant,
 * porté par le layout /vendeur).
 *
 * Succès : le rôle prend effet avec le même access token (pas de
 * reconnexion), mais la session en mémoire (`useAuth().user`) ne le reflète
 * pas tant qu'elle n'a pas été rafraîchie — `refresh()` (AuthProvider,
 * mécanisme déjà utilisé par T36 après persistance du téléphone) avant la
 * redirection /dashboard, où le bandeau « en attente de validation »
 * s'affichera naturellement dès que la sidebar/AppShell verra le nouveau rôle.
 */
export function DevenirVendeurView() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [telephoneInput, setTelephoneInput] = useState("");
  const [telephoneError, setTelephoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const needsTelephone = !user.telephone;

  function handleOpen() {
    setTelephoneInput("");
    setTelephoneError(null);
    setGeneralError(null);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    let telephone: string | undefined;
    if (needsTelephone) {
      const trimmed = telephoneInput.trim();
      if (!trimmed) {
        setTelephoneError("Un numéro de téléphone est requis pour devenir vendeur.");
        return;
      }
      telephone = trimmed;
    }
    setTelephoneError(null);
    setGeneralError(null);
    setSubmitting(true);
    try {
      await devenirVendeur(telephone);
      // Le rôle est déjà effectif côté serveur avec le même jeton — la
      // session en mémoire doit être resynchronisée avant de compter dessus
      // ailleurs (sidebar, bandeau de validation T30).
      await refresh();
      setConfirmOpen(false);
      router.push("/dashboard");
    } catch (err) {
      const { field, message } = describeDevenirVendeurFormError(err);
      if (field === "telephone") {
        // Reste ouverte pour permettre de corriger la saisie.
        setTelephoneError(message);
      } else {
        setConfirmOpen(false);
        setGeneralError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 pb-[60px] pt-[28px] sm:px-8">
      <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
        Devenir vendeur
      </h1>
      <p className="mb-6 text-[14.5px] leading-relaxed text-brand-subtle">
        Ton compte passe en espace vendeur : catalogue, demandes reçues, publication de produits.
        La publication reste bloquée tant qu&apos;un administrateur n&apos;a pas validé ton compte
        — ton espace acheteur (produits, mes demandes) reste utilisable pendant ce temps.
      </p>

      {generalError ? (
        <Alert variant="danger" className="mb-5">
          {generalError}
        </Alert>
      ) : null}

      <Button onClick={handleOpen}>Devenir vendeur</Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Devenir vendeur ?"
        description={
          <div className="flex flex-col gap-3">
            <p>
              Ton compte passera immédiatement en espace vendeur. Tu pourras publier des produits
              dès qu&apos;un administrateur aura validé ton compte.
            </p>
            {needsTelephone ? (
              <Input
                label="Ton numéro de téléphone"
                type="tel"
                autoComplete="tel"
                placeholder="+224 622 00 00 00"
                value={telephoneInput}
                onChange={(event) => {
                  setTelephoneInput(event.target.value);
                  setTelephoneError(null);
                }}
                error={telephoneError ?? undefined}
                hint={telephoneError ? undefined : "Canal de contact des acheteurs une fois vendeur."}
                disabled={submitting}
                required
              />
            ) : null}
          </div>
        }
        confirmLabel="Devenir vendeur"
        cancelLabel="Annuler"
        busy={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
