"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { GeoProvider } from "@/lib/geo";
import { NotificationsProvider } from "@/lib/notifications";
import { DemandesProvider, DemandesRecuesProvider } from "@/lib/purchase-requests";

import { Sidebar } from "./Sidebar";

/**
 * Coquille du groupe de routes (app) : protège /produits et consorts
 * derrière une session active (AuthProvider) — sans utilisateur chargé,
 * redirection vers /connexion — puis rend la sidebar + le contenu de page.
 * `GeoProvider`, `DemandesProvider`, `DemandesRecuesProvider` et
 * `NotificationsProvider` sont montés ici (au-dessus de la sidebar ET du
 * contenu), pour tous les rôles, afin que la position acquise, le compteur
 * de demandes en cours (badge « Ma demande », T16), le compteur de demandes
 * reçues en attente (badge « Demandes reçues », T17b) et le compteur de
 * notifications non lues (cloche sidebar) soient visibles partout, une
 * seule fois la session confirmée active.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/connexion");
    }
  }, [loading, user, router]);

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (loading || !user) {
    // Pas de flash de contenu protégé pendant la restauration de session /
    // la redirection : coquille vide, cohérente avec le fond de l'app.
    return <div className="min-h-screen bg-cream" />;
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
