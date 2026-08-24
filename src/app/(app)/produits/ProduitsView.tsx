"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Alert, Button } from "@/components/ui";
import { SearchField } from "@/components/app/SearchField";
import { ProductCard } from "@/components/products/ProductCard";
import { ApiError } from "@/lib/api";
import { listCategories } from "@/lib/categories/api";
import type { CategoryListItem } from "@/lib/categories/types";
import { cn } from "@/lib/cn";
import { useGeo } from "@/lib/geo";
import { searchProducts } from "@/lib/products/api";
import type { ProductSearchItem, TriProduits } from "@/lib/products/types";

/**
 * Page « Près de toi, maintenant » (/produits) — écran isHome du prototype.
 * Géoloc via useGeo() (partagée avec la sidebar) : JAMAIS demandée
 * automatiquement (T64) — seulement au clic sur « Activer ma position » ou
 * sur le tri « Plus proche » quand aucune position n'est connue. Avec
 * position connue, tri par proximité et rayon réglable ; sans position
 * (idle/refus/indisponibilité), bandeau d'invitation + repli sur tri=recent
 * (accepté par le backend).
 */

const RAYONS = [5, 25, 50] as const;
const DEFAULT_RAYON = 25;
const PAGE_SIZE = 20;

type SortPref = Extract<TriProduits, "proche" | "prix_asc">;

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-white">
      <div className="h-[168px] bg-beige-soft" />
      <div className="flex flex-col gap-2 px-[15px] pb-4 pt-[14px]">
        <div className="h-4 w-3/4 rounded bg-beige-soft" />
        <div className="h-5 w-1/2 rounded bg-beige-soft" />
        <div className="h-3 w-2/3 rounded bg-beige-soft" />
      </div>
    </div>
  );
}

export function ProduitsView() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() || "";
  // Lu une seule fois, à l'arrivée sur la page (T64③) — une tuile catégorie
  // de la landing pointe vers /produits?categorie=<slug>. Validé contre la
  // liste des catégories une fois celle-ci chargée ci-dessous ; un slug
  // inconnu ou absent laisse categorieSlug à null (chip « Tous »).
  const categorieParam = searchParams.get("categorie")?.trim() || null;
  const { status: geoStatus, position, request } = useGeo();

  const [rayon, setRayon] = useState<number>(DEFAULT_RAYON);
  const [sortPref, setSortPref] = useState<SortPref>("proche");
  const [categorieSlug, setCategorieSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  const [items, setItems] = useState<ProductSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // T64① : la géoloc n'est plus jamais demandée au montage — seulement au
  // clic sur « Activer ma position » (bandeau) ou sur le tri « Plus proche »
  // sans position connue (cf. plus bas). `useGeo()`/`useGeolocation` restent
  // idempotents : une position déjà en sessionStorage arrive directement à
  // l'état `granted`, sans passer par `request()`.

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((list) => {
        if (cancelled) return;
        setCategories(list);
        const topLevel = list.filter((c) => c.parentId === null);
        if (categorieParam && topLevel.some((c) => c.slug === categorieParam)) {
          setCategorieSlug(categorieParam);
        }
      })
      .catch(() => {
        // Chips catégories non bloquantes — la recherche fonctionne sans.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categorieParam lu une seule fois, à l'arrivée sur la page.
  }, []);

  const hasPosition = position !== null;
  const effectiveTri: TriProduits = sortPref === "proche" && !hasPosition ? "recent" : sortPref;

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await searchProducts({
          lat: position?.lat,
          lng: position?.lng,
          rayon: position ? rayon : undefined,
          categorie: categorieSlug ?? undefined,
          q: q || undefined,
          tri: effectiveTri,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setTotal(result.total);
        setPage(result.page);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Impossible de charger les produits. Réessaie.",
        );
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [position, rayon, categorieSlug, q, effectiveTri],
  );

  // Repart de la page 1 à chaque changement de filtre (position, rayon, tri,
  // catégorie, recherche texte). fetchPage met à jour `loading` de façon
  // synchrone avant son premier `await` — délibéré (skeleton immédiat), d'où
  // la désactivation ciblée de la règle set-state-in-effect ci-dessous.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, rayon, categorieSlug, q, effectiveTri]);

  const topLevelCategories = categories.filter((c) => c.parentId === null);

  // Depuis T38b, GET /products inclut aussi les produits actifs sans
  // coordonnées (distanceKm: null) — ils ne sont pas forcément dans le
  // rayon affiché, donc le libellé ne peut plus l'affirmer pour tous les
  // résultats.
  const subtitle = hasPosition
    ? `${total} produit${total > 1 ? "s" : ""} actif${total > 1 ? "s" : ""} dans un rayon de ${rayon} km ou sans localisation précisée${
        sortPref === "proche" ? " · triés du plus proche au plus loin" : " · triés par prix croissant"
      }`
    : `${total} produit${total > 1 ? "s" : ""} actif${total > 1 ? "s" : ""} · triés par plus récents`;

  // T64① : cliquer « Plus proche » sans position connue déclenche la demande
  // de géoloc (le tri « proche » ne s'applique réellement qu'une fois la
  // permission accordée — cf. `effectiveTri` plus haut, qui replie sur
  // « recent » tant que `hasPosition` est faux).
  function handleSortProche() {
    setSortPref("proche");
    if (!hasPosition) request();
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[28px] sm:px-8 lg:px-10">
      {/* T64② : recherche visible en tête de page, mobile comme desktop —
          même mécanique (debounce + navigation ?q=) que le champ de la
          sidebar, factorisée dans SearchField (props de style/valeur
          initiale). */}
      <SearchField initialValue={q} variant="page" className="mb-5 sm:max-w-md" />

      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-1.5 font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
            Près de toi, maintenant
          </h1>
          <p className="text-[14.5px] text-brand-subtle">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={geoStatus === "asking"}
            onClick={handleSortProche}
            className={cn(
              "rounded-full border px-[15px] py-[9px] text-[13.5px] transition-colors",
              geoStatus === "asking"
                ? "cursor-wait border-border text-brand-faint opacity-60"
                : sortPref === "proche" && hasPosition
                  ? "border-brand bg-brand text-cream"
                  : "border-border-strong bg-white text-ink hover:border-brand",
            )}
          >
            {geoStatus === "asking" ? "Localisation…" : "Plus proche"}
          </button>
          <button
            type="button"
            onClick={() => setSortPref("prix_asc")}
            className={cn(
              "rounded-full border px-[15px] py-[9px] text-[13.5px] transition-colors",
              sortPref === "prix_asc"
                ? "border-brand bg-brand text-cream"
                : "border-border-strong bg-white text-ink hover:border-brand",
            )}
          >
            Prix croissant
          </button>
        </div>
      </div>

      {/* T64① : visible tant qu'aucune position n'est connue (idle/asking/
          denied) — la géoloc n'est plus jamais demandée d'office, ce bandeau
          est donc désormais le déclencheur principal, avec une phrase
          d'explication avant le bouton pour rassurer un public non
          technicien avant la popup navigateur. */}
      {!hasPosition ? (
        <Alert variant="neutral" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>
            Active ta position pour voir les produits proches. Ta position sert uniquement à trier
            par distance. Elle n&apos;est pas enregistrée.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => request()}
            disabled={geoStatus === "asking"}
          >
            {geoStatus === "asking" ? "Localisation…" : "Activer ma position"}
          </Button>
        </Alert>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-brand-subtle">Rayon&nbsp;:</span>
        {RAYONS.map((value) => (
          <button
            key={value}
            type="button"
            disabled={!hasPosition}
            onClick={() => setRayon(value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-[13px] transition-colors",
              !hasPosition
                ? "cursor-not-allowed border-border text-brand-faint opacity-60"
                : rayon === value
                  ? "border-brand bg-brand text-cream"
                  : "border-border-strong bg-white text-ink hover:border-brand",
            )}
          >
            {value} km
          </button>
        ))}
      </div>

      <div className="mb-[26px] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategorieSlug(null)}
          className={cn(
            "rounded-[10px] border px-4 py-[9px] text-[13.5px] transition-colors",
            categorieSlug === null
              ? "border-brand bg-brand text-cream"
              : "border-border-strong bg-white text-ink hover:border-brand",
          )}
        >
          Tous
        </button>
        {topLevelCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategorieSlug(cat.slug)}
            className={cn(
              "rounded-[10px] border px-4 py-[9px] text-[13.5px] transition-colors",
              categorieSlug === cat.slug
                ? "border-brand bg-brand text-cream"
                : "border-border-strong bg-white text-ink hover:border-brand",
            )}
          >
            {cat.nom}
          </button>
        ))}
      </div>

      {error ? (
        <Alert variant="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchPage(1, false)}>
            Réessayer
          </Button>
        </Alert>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-white px-6 py-16 text-center text-[14.5px] text-brand-subtle">
          Aucun produit ne correspond à ta recherche pour l&apos;instant.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
          {items.length < total ? (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => fetchPage(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? "Chargement…" : "Voir plus"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
