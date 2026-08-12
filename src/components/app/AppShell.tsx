"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { GeoProvider } from "@/lib/geo";
import { NotificationsProvider } from "@/lib/notifications";
import { DemandesProvider, DemandesRecuesProvider } from "@/lib/purchase-requests";

import { Sidebar } from "./Sidebar";

/**
 * Préfixes de route consultables sans session (T51 — catalogue consultable
 * sans compte, la connexion n'est exigée qu'au moment d'agir). Tout le reste
 * du groupe (app) reste protégé, redirection vers /connexion inchangée.
 */
const PUBLIC_PATH_PREFIXES = ["/produits", "/vendeurs"] as const;

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Coquille du groupe de routes (app).
 *
 * `loading` vaut **toujours** `true` au tout premier rendu, aussi bien côté
 * serveur (`AuthProvider` ne peut trancher qu'après un appel réseau,
 * `/auth/refresh`, T28) que côté client au tout premier rendu avant
 * hydratation (même état initial `useState(true)`, cf. AuthProvider.tsx) —
 * les deux rendus sont donc garantis identiques tant qu'on ne se sert pas de
 * `loading` pour distinguer serveur et client. C'est cette propriété que
 * T54 exploite : sur une route publique, `loading` ne doit plus aiguiller
 * vers la coquille vide, car il n'y a aucun contenu privé à protéger pendant
 * la restauration de session — masquer `children` derrière `loading` n'y
 * servait qu'à retarder l'affichage, au prix de livrer un HTML au corps vide
 * aux robots d'indexation (T53 : le JSON-LD n'atteignait alors que le flight
 * payload, jamais le HTML servi).
 *
 * Trois modes :
 * - route protégée, session en cours de restauration OU absente
 *   (`loading || !user`, hors route publique) → coquille vide, strictement
 *   inchangé : c'est le seul cas où un flash de contenu privé serait
 *   possible (avant que l'effet ci-dessous ne redirige vers /connexion) ;
 * - route publique (T51, {@link PUBLIC_PATH_PREFIXES}) sans utilisateur
 *   confirmé — que la session soit en cours de restauration ou confirmée
 *   absente, les deux cas se traitent identiquement ici — → mode visiteur,
 *   sans redirection : `children` est rendu (T54), sidebar réduite (Sidebar
 *   avec `user={null}`) et seul `GeoProvider` monté (distance produit,
 *   position sidebar) — `DemandesProvider`, `DemandesRecuesProvider` et
 *   `NotificationsProvider` exigent tous une session (GET /demandes,
 *   GET /notifications) : les monter pour un visiteur déclencherait un 401
 *   silencieux à chaque montage, sans utilité (pas de badge/cloche visiteur).
 *   Compromis assumé (T54) : un visiteur déjà connecté peut voir la sidebar
 *   visiteur clignoter le temps que la session soit confirmée — le contenu,
 *   lui, ne bouge pas ;
 * - session active confirmée → mode habituel, sidebar + providers rôle
 *   (inchangé).
 *
 * `GeoProvider`, `DemandesProvider`, `DemandesRecuesProvider` et
 * `NotificationsProvider` sont montés au-dessus de la sidebar ET du contenu,
 * pour tous les rôles, afin que la position acquise, le compteur de demandes
 * en cours (badge « Ma demande », T16), le compteur de demandes reçues en
 * attente (badge « Demandes reçues », T17b) et le compteur de notifications
 * non lues (cloche sidebar) soient visibles partout, une seule fois la
 * session confirmée active.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (!loading && !user && !publicPath) {
      router.replace("/connexion");
    }
  }, [loading, user, publicPath, router]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (!publicPath && (loading || !user)) {
    // Route protégée : pas de flash de contenu privé pendant la
    // restauration de session ou la redirection vers /connexion : coquille
    // vide, cohérente avec le fond de l'app. Équivalent strict de l'ancienne
    // condition `loading || (!user && !publicPath)` restreinte aux routes
    // non publiques (voir le commentaire au-dessus du composant) — le
    // comportement sur ces routes est inchangé par T54.
    return <div className="min-h-screen bg-cream" />;
  }

  if (!user) {
    // Route publique (T51/T54) sans utilisateur confirmé — session en cours
    // de restauration (`loading` encore vrai) ou confirmée absente, les deux
    // se rendent à l'identique : visiteur, sidebar réduite, pas de
    // providers qui supposent une session active. `children` est rendu ici
    // (T54) : c'est ce qui met le contenu de la page dans le HTML servi.
    return (
      <GeoProvider>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar user={null} />
          <main className="min-w-0 flex-1 bg-cream">{children}</main>
        </div>
      </GeoProvider>
    );
  }

  return (
    <GeoProvider>
      <DemandesProvider>
        <DemandesRecuesProvider>
          <NotificationsProvider>
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar user={user} onLogout={handleLogout} />
              <main className="min-w-0 flex-1 bg-cream">{children}</main>
            </div>
          </NotificationsProvider>
        </DemandesRecuesProvider>
      </DemandesProvider>
    </GeoProvider>
  );
}
