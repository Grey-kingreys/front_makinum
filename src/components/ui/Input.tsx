import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "champ"
  );
}

export interface InputProps extends Omit<ComponentProps<"input">, "id"> {
  /** Libellé affiché au-dessus du champ (obligatoire — accessibilité). */
  label: string;
  /** Identifiant explicite ; sinon dérivé du libellé. */
  id?: string;
  /** Texte d'aide affiché sous le champ. */
  hint?: string;
  /** Message d'erreur — remplace le hint et bascule le champ en état invalide. */
  error?: string;
  containerClassName?: string;
  /** Élément affiché dans le champ, aligné à droite (ex. bouton toggle mot de passe). */
  endAdornment?: ReactNode;
}

/**
 * Champ de saisie avec libellé, fidèle au prototype (bordure fine, coins
 * arrondis, focus vert marque). Server Component : aucune interactivité
 * propre, `onChange`/`value` sont fournis par l'appelant.
 */
export function Input({
  label,
  id,
  hint,
  error,
  className,
  containerClassName,
  endAdornment,
  ref,
  ...props
}: InputProps) {
  const inputId = id ?? `field-${slugify(label)}`;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={cn("flex flex-col gap-[7px]", containerClassName)}>
      <label htmlFor={inputId} className="text-[13px] text-brand-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-md border bg-white px-[14px] py-[14px] text-[15px] text-ink outline-none transition-colors placeholder:text-brand-placeholder focus-visible:shadow-focus-brand",
            error ? "border-danger focus:border-danger" : "border-border-strong focus:border-brand",
            endAdornment ? "pr-11" : "",
            className,
          )}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{endAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[12.5px] text-brand-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
