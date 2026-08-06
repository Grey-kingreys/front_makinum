"use client";

import { useState } from "react";

import { Input, type InputProps } from "./Input";

export type PasswordInputProps = Omit<InputProps, "type" | "endAdornment">;

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M8.36 4.16A9 9 0 0 1 10 4c5.5 0 8.5 6 8.5 6a15 15 0 0 1-2.1 3M6.1 5.9C3.2 7.4 1.5 10 1.5 10s1.6 3 5 4.8" />
      <path d="M11.6 11.6a2.25 2.25 0 0 1-3.2-3.2" />
      <path d="M2 2l16 16" />
    </svg>
  );
}

/**
 * Champ mot de passe avec bouton de bascule affiché/masqué, construit sur
 * `Input` (label, hint, erreur par champ hérités). Client Component : porte
 * son propre état d'affichage, sans exposer `type` (imposé password/text).
 */
export function PasswordInput({ ref, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          onClick={() => setVisible((prev) => !prev)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-brand-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:shadow-focus-brand"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...props}
    />
  );
}
