"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/auth/types";
import { listAdminUsers } from "@/lib/admin";
import { useNotifications } from "@/lib/notifications";
import { getMyProducts, MAX_PRODUITS_ACTIFS } from "@/lib/products/vendor-api";
import type { ProductView } from "@/lib/products/types";
import { useDemandes, useDemandesRecues } from "@/lib/purchase-requests";
import { listReports } from "@/lib/reports";
import { listVendeurReviews } from "@/lib/reviews";
import type { ReviewResume } from "@/lib/reviews";

/**
 * Tableau de bord (/dashboard) — page d'arrivée après connexion
 * (ConnexionForm redirige ici, tout comme la garde « déjà connecté » de
 * /connexion, /inscription, /recuperation). Dans le groupe (app), donc déjà
 * protégée par AppShell (session active garantie avant montage). Tuiles
 * construites uniquement à partir des providers déjà montés dans AppShell
 * (notifications, demandes — même compteurs que la sidebar) et des
 * endpoints de lecture existants (aucun endpoint ni champ backend nouveau) :
 * chaque rôle voit un sous-ensemble de tuiles + actions rapides, même
 * découpage par rôle que Sidebar.tsx. Chaque tuile vendeur/admin (produits,
 * avis, signalements, utilisateurs) fait son propre fetch, indépendant des
 * autres : l'échec d'un endpoint affiche « — » sur sa tuile sans casser le
 * reste de la page.
 */

const ROLE_LABELS: Record<Role, string> = {
  ACHETEUR: "Acheteur",
  VENDEUR: "Vendeur",
  ADMIN: "Admin",
};

interface QuickAction {
  href: string;
  label: string;
}

/** Tous les rôles. */
const BASE_ACTIONS: QuickAction[] = [
  { href: "/produits", label: "Voir les produits" },
  { href: "/demandes", label: "Ma demande" },
];

const VENDEUR_ACTIONS: QuickAction[] = [
  { href: "/vendeur/catalogue", label: "Mon catalogue" },
  { href: "/vendeur/produits/nouveau", label: "Publier un produit" },
  { href: "/vendeur/demandes", label: "Demandes reçues" },
];

const ADMIN_ACTIONS: QuickAction[] = [
  { href: "/admin/moderation", label: "Modération" },
  { href: "/admin/vendeurs", label: "Vendeurs" },
];

interface StatTileProps {
  label: string;
  value: string | number;
  href: string;
  loading: boolean;
}

/** Tuile analytique : chiffre + libellé + lien — esprit des stats de la landing (0 GNF / < 5 km / 3 niveaux). */
function StatTile({ label, value, href, loading }: StatTileProps) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-white p-5" aria-hidden="true">
        <div className="h-[27px] w-14 rounded bg-beige-soft" />
        <div className="mt-2.5 h-3 w-28 rounded bg-beige-soft" />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-white p-5 transition-colors hover:border-brand hover:shadow-soft"
    >
      <div className="font-display text-[27px] font-bold text-brand">{value}</div>
      <div className="mt-1 text-[13px] text-brand-subtle">{label}</div>
    </Link>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const { nbNonLues, loading: notifLoading } = useNotifications();
  const { demandes, loading: demandesLoading } = useDemandes();
  const { pendingCount, loading: demandesRecuesLoading } = useDemandesRecues();

  const isVendeur = user?.role === "VENDEUR";
  const isAdmin = user?.role === "ADMIN";
  const userId = user?.id;

  const [products, setProducts] = useState<ProductView[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  const [reviewResume, setReviewResume] = useState<ReviewResume | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState(false);

  const [reportsTotal, setReportsTotal] = useState<number | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(false);

  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(false);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(false);
    try {
      setProducts(await getMyProducts());
    } catch {
      setProductsError(true);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async (vendeurId: string) => {
    setReviewLoading(true);
    setReviewError(false);
    try {
      const result = await listVendeurReviews(vendeurId, { limit: 1 });
      setReviewResume(result.resume);
    } catch {
      setReviewError(true);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(false);
    try {
      const result = await listReports({ statut: "NOUVEAU", limit: 1 });
      setReportsTotal(result.total);
    } catch {
      setReportsError(true);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(false);
    try {
      const result = await listAdminUsers({ limit: 1 });
      setUsersTotal(result.total);
    } catch {
      setUsersError(true);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isVendeur) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial dès que le rôle vendeur est connu, même convention que DemandesProvider.
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProducts() est stable (useCallback sans dépendance) ; une seule tentative par activation du rôle vendeur.
  }, [isVendeur]);

  useEffect(() => {
    if (!isVendeur || !userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial dès que le rôle vendeur (et son id) est connu.
    loadReviews(userId);
  }, [isVendeur, userId, loadReviews]);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial dès que le rôle admin est connu, même convention que DemandesProvider.
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadReports() est stable (useCallback sans dépendance) ; une seule tentative par activation du rôle admin.
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial dès que le rôle admin est connu, même convention que DemandesProvider.
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadUsers() est stable (useCallback sans dépendance) ; une seule tentative par activation du rôle admin.
  }, [isAdmin]);

  if (!user) return null;

  const draftCount = demandes?.filter((demande) => demande.statut === "EN_COURS").length ?? 0;
  const sentCount = demandes?.filter((demande) => demande.statut === "ENVOYEE").length ?? 0;
  const closedCount = demandes?.filter((demande) => demande.statut === "CLOTUREE").length ?? 0;

  const activeProducts = products?.filter((product) => product.actif).length ?? 0;
  const inactiveProducts = products?.filter((product) => !product.actif).length ?? 0;

  const noteMoyenneValue =
    reviewResume?.noteMoyenne != null
      ? `★ ${reviewResume.noteMoyenne} (${reviewResume.nbAvis})`
      : "Aucun avis";

  const actions: QuickAction[] = [
    ...BASE_ACTIONS,
    ...(isVendeur ? VENDEUR_ACTIONS : []),
    ...(isAdmin ? ADMIN_ACTIONS : []),
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-[60px] pt-[28px] sm:px-8 lg:px-10">
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[27px] font-bold tracking-tight text-ink sm:text-[33px]">
          Bonjour, {user.nom}
        </h1>
        <Badge variant="neutral">{ROLE_LABELS[user.role]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Notifications non lues"
          value={nbNonLues}
          href="/notifications"
          loading={notifLoading}
        />
        <StatTile label="Brouillons" value={draftCount} href="/demandes" loading={demandesLoading} />
        <StatTile label="Envoyées" value={sentCount} href="/demandes" loading={demandesLoading} />
        <StatTile label="Clôturées" value={closedCount} href="/demandes" loading={demandesLoading} />

        {isVendeur ? (
          <>
            <StatTile
              label="Produits actifs"
              value={productsError ? "—" : `${activeProducts}/${MAX_PRODUITS_ACTIFS}`}
              href="/vendeur/catalogue"
              loading={productsLoading}
            />
            <StatTile
              label="Produits inactifs"
              value={productsError ? "—" : inactiveProducts}
              href="/vendeur/catalogue"
              loading={productsLoading}
            />
            <StatTile
              label="Demandes reçues en attente"
              value={pendingCount}
              href="/vendeur/demandes"
              loading={demandesRecuesLoading}
            />
            <StatTile
              label="Note moyenne"
              value={reviewError ? "—" : noteMoyenneValue}
              href="/vendeur/catalogue"
              loading={reviewLoading}
            />
          </>
        ) : null}

        {isAdmin ? (
          <>
            <StatTile
              label="Signalements nouveaux"
              value={reportsError ? "—" : (reportsTotal ?? "—")}
              href="/admin/moderation"
              loading={reportsLoading}
            />
            <StatTile
              label="Utilisateurs"
              value={usersError ? "—" : (usersTotal ?? "—")}
              href="/admin/vendeurs"
              loading={usersLoading}
            />
          </>
        ) : null}
      </div>

      <div className="mt-9">
        <h2 className="mb-3 font-display text-[16px] font-bold text-ink">Actions rapides</h2>
        <div className="flex flex-wrap gap-2.5">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center justify-center rounded-md border border-border-strong bg-white px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
