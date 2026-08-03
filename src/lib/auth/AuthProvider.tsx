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

import { apiFetch } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/auth/token";
import type { LoginResponse, PublicUser } from "@/lib/auth/types";

export interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifiant: string, motDePasse: string) => Promise<PublicUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** GET /auth/me ; efface le jeton et renvoie `null` s'il est absent/invalide. */
async function fetchCurrentUser(): Promise<PublicUser | null> {
  if (!getToken()) return null;
  try {
    return await apiFetch<PublicUser>("/auth/me", { method: "GET" });
  } catch {
    clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  // Initialisation paresseuse : s'il n'y a pas de jeton stocké, on est déjà
  // fixé sur l'état "déconnecté" dès le premier rendu — pas besoin d'attendre
  // un effet pour le savoir.
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Restauration de session au montage uniquement.
  }, []);

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
    setToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    clearToken();
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
