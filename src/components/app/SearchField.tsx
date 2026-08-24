"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

const DEBOUNCE_MS = 400;

export interface SearchFieldProps {
  /**
   * Valeur initiale du champ — permet à l'appelant qui connaît déjà le `?q=`
   * courant (ex. ProduitsView, via `useSearchParams`) de le refléter dès
   * l'arrivée, sans dupliquer la lecture de l'URL ni la logique de debounce
   * ici. Vide par défaut (comportement historique de la sidebar).
   */
  initialValue?: string;
  /**
   * "sidebar" (défaut) : fond sombre, utilisé dans la Sidebar applicative.
   * "page" : fond clair, pour un usage en tête de page (ex. /produits, T64②).
   */
  variant?: "sidebar" | "page";
  className?: string;
}

/**
 * Champ « Chercher un produit » — branché sur /produits?q=… (le param `q`
 * de GET /products), avec un debounce simple pour éviter une navigation à
 * chaque frappe. Réutilisé tel quel (T64②) par la sidebar et par la page
 * /produits (variant "page", en tête de page, visible sans ouvrir le
 * drawer mobile) — une seule implémentation du debounce/de la navigation.
 */
export function SearchField({ initialValue = "", variant = "sidebar", className }: SearchFieldProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const trimmed = next.trim();
      router.push(trimmed ? `/produits?q=${encodeURIComponent(trimmed)}` : "/produits");
    }, DEBOUNCE_MS);
  }

  const isPage = variant === "page";

  return (
    <div
      className={cn(
        "flex items-center gap-[9px] rounded-[10px] border px-3 py-[10px]",
        isPage ? "border-border-strong bg-white" : "mb-[18px] border-cream/16 bg-cream/8",
        className,
      )}
    >
      <span
        className={cn("text-[14px]", isPage ? "text-brand-faint" : "text-cream/50")}
        aria-hidden="true"
      >
        ⌕
      </span>
      <input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Chercher un produit"
        aria-label="Chercher un produit"
        className={cn(
          "min-w-0 flex-1 border-none bg-transparent text-[14px] outline-none",
          isPage ? "text-ink placeholder:text-brand-faint" : "text-cream placeholder:text-cream/50",
        )}
      />
    </div>
  );
}
