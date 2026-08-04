"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEBOUNCE_MS = 400;

/**
 * Champ « Chercher un produit » de la sidebar — branché sur /produits?q=…
 * (le param `q` de GET /products), avec un debounce simple pour éviter une
 * navigation à chaque frappe.
 */
export function SearchField() {
  const router = useRouter();
  const [value, setValue] = useState("");
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

  return (
    <div className="mb-[18px] flex items-center gap-[9px] rounded-[10px] border border-cream/16 bg-cream/8 px-3 py-[10px]">
      <span className="text-[14px] text-cream/50" aria-hidden="true">
        ⌕
      </span>
      <input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Chercher un produit"
        aria-label="Chercher un produit"
        className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-cream outline-none placeholder:text-cream/50"
      />
    </div>
  );
}
