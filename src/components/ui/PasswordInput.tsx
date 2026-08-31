"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input, type InputProps } from "./Input";

export type PasswordInputProps = Omit<InputProps, "type" | "endAdornment">;

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
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      }
      {...props}
    />
  );
}
