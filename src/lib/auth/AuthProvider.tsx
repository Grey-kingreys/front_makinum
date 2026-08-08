"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch, refreshSession } from "@/lib/api";
import {
  clearAccessToken,
  onSessionExpired,
  setAccessToken,
} from "@/lib/auth/session";
import type { LoginResponse, PublicUser } from "@/lib/auth/types";

export interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifiant: string, motDePasse: string) => Promise<PublicUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** GET /auth/me ; renvoie `null` si la session n'est plus exploitable. */
async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    return await apiFetch<PublicUser>("/auth/me", { method: "GET" });
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  // Le jeton d'accès vit en mémoire seule (T28) : après un rechargement il
  // n'y a plus rien à inspecter localement, et le cookie de rafraîchissement
  // est httpOnly. Impossible donc de trancher sans appeler le serveur — on
  // démarre toujours en chargement, et les gardes de route (AppShell,
  // /connexion) attendent au lieu de rediriger à tort.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then(({ user: me }) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // 401 INVALID_REFRESH_TOKEN = simple visiteur non connecté : c'est le
        // cas nominal, aucune erreur à afficher.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Restauration de session au montage uniquement.
  }, []);

  // Rafraîchissement refusé en cours de navigation (cookie expiré ou
  // révoqué) : l'application bascule en déconnecté, AppShell renvoie alors
  // vers /connexion.
  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const refresh = useCallback(async () => {
    const me = await fetchCurrentUser();
    setUser(me);
  }, []);

  const login = useCallback(async (identifiant: string, motDePasse: string) => {
    const { accessToken, user: loggedInUser } = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { identifiant, motDePasse },
      skipAuth: true,
    });
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    // Révocation serveur (efface le cookie de rafraîchissement) lancée avec
    // le jeton encore en mémoire — `apiFetch` compose ses en-têtes de façon
    // synchrone. L'échec réseau ne doit pas retenir la déconnexion locale,
    // qui est immédiate et inconditionnelle.
    void apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    clearAccessToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>.");
  }
  return ctx;
}
