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
 * Coquille du groupe de routes (app). Deux modes une fois la session résolue
 * (`loading` retombé à `false`) :
 * - session active → mode habituel, sidebar + providers rôle (inchangé) ;
 * - pas de session sur une route publique (T51, {@link PUBLIC_PATH_PREFIXES})
 *   → mode visiteur, sans redirection : sidebar réduite (Sidebar avec
 *   `user={null}`) et seul `GeoProvider` monté (distance produit, position
 *   sidebar) — `DemandesProvider`, `DemandesRecuesProvider` et
 *   `NotificationsProvider` exigent tous une session (GET /demandes,
 *   GET /notifications) : les monter pour un visiteur déclencherait un 401
 *   silencieux à chaque montage, sans utilité (pas de badge/cloche visiteur) ;
 * - pas de session ailleurs → redirection vers /connexion (comportement
 *   d'origine, strictement inchangé).
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

  if (loading || (!user && !publicPath)) {
    // Pas de flash de contenu protégé pendant la restauration de session /
    // la redirection : coquille vide, cohérente avec le fond de l'app. Un
    // visiteur sur une route publique ne reste jamais dans cette branche une
    // fois `loading` retombé : il tombe dans le mode visiteur ci-dessous
    // plutôt qu'un écran vide permanent.
    return <div className="min-h-screen bg-cream" />;
  }

  if (!user) {
    // Visiteur anonyme sur une route publique (T51) : sidebar réduite, pas
    // de providers qui supposent une session active.
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
