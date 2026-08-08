import {
  clearAccessToken,
  getAccessToken,
  notifySessionExpired,
  setAccessToken,
  singleFlightRefresh,
} from "@/lib/auth/session";
import type { LoginResponse } from "@/lib/auth/types";

const DEFAULT_BASE_URL = "http://localhost:4000";

/** URL de base de l'API backend, surchargeable via NEXT_PUBLIC_API_URL. */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BASE_URL;
}

/**
 * Erreur typée renvoyée par le client API. Le backend renvoie ses erreurs
 * métier sous la forme `{ code, message }` (ex. INVALID_CREDENTIALS,
 * PHONE_NOT_VERIFIED, ACCOUNT_SUSPENDED) — `code` reste absent pour les
 * erreurs réseau ou les erreurs de validation génériques sans code métier.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as ApiErrorBody).message;
    if (Array.isArray(message) && message.length > 0) {
      return message.join(" ");
    }
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

function extractErrorCode(body: unknown): string | undefined {
  if (body && typeof body === "object" && "code" in body) {
    const code = (body as ApiErrorBody).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /**
   * Sérialisé en JSON automatiquement (Content-Type appliqué si absent).
   * Un `FormData` (premier usage : upload de photos produit, voir
   * src/lib/products/vendor-api.ts) est transmis tel quel, sans sérialisation
   * ni Content-Type imposé — le navigateur pose lui-même le `boundary`
   * multipart, qu'un Content-Type manuel écraserait.
   */
  body?: unknown;
  /**
   * N'injecte pas l'en-tête Authorization même si un jeton est présent.
   * Une requête volontairement anonyme ne déclenche pas non plus le
   * renouvellement automatique sur 401 : le rejeu serait tout aussi anonyme.
   */
  skipAuth?: boolean;
}

/**
 * Endpoints d'authentification dont un 401 ne doit **jamais** déclencher de
 * rafraîchissement : `/auth/login` (mauvais identifiants — rafraîchir n'y
 * changerait rien) et `/auth/refresh` lui-même (boucle infinie).
 * `/auth/logout` est idempotent côté backend, inutile d'y insister.
 */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

function allowsRefresh(path: string): boolean {
  const pathname = path.split("?")[0];
  return !NO_REFRESH_PATHS.includes(pathname);
}

/**
 * Wrapper fetch générique vers l'API Makinum : sérialise le corps en JSON
 * (ou le transmet tel quel s'il s'agit d'un FormData), joint le cookie de
 * session (`credentials: "include"`), injecte `Authorization: Bearer <token>`
 * si une session est active, et lève une {@link ApiError} typée en cas
 * d'échec.
 *
 * Sur un 401 d'une requête authentifiée, tente **une seule fois**
 * `POST /auth/refresh` puis rejoue la requête d'origine avec le nouveau
 * jeton (voir {@link refreshSession}). Si le rafraîchissement échoue, le 401
 * d'origine est propagé et l'application bascule en état déconnecté.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  return sendRequest<T>(path, options, allowsRefresh(path));
}

async function sendRequest<T>(
  path: string,
  options: ApiFetchOptions,
  canRefresh: boolean,
): Promise<T> {
  const { body, skipAuth = false, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      // Sans quoi le cookie httpOnly `makinum_refresh` ne circule pas :
      // l'API est sur une autre origine, le CORS backend l'autorise
      // explicitement (credentials: true + origine exacte).
      credentials: "include",
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur Makinum.", "NETWORK_ERROR");
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && canRefresh && !skipAuth) {
      try {
        await refreshSession();
      } catch {
        // Rafraîchissement refusé : la session est bel et bien finie, on
        // propage le 401 d'origine (refreshSession a déjà prévenu l'app).
        throw toApiError(response.status, data);
      }
      // Rejeu unique, avec le jeton fraîchement obtenu.
      return sendRequest<T>(path, options, false);
    }
    throw toApiError(response.status, data);
  }

  return data as T;
}

function toApiError(status: number, data: unknown): ApiError {
  return new ApiError(status, extractErrorMessage(data, `Erreur ${status}`), extractErrorCode(data));
}

/**
 * `POST /auth/refresh` — sans corps, authentifié par le seul cookie httpOnly
 * `makinum_refresh`. Renvoie le nouveau couple `{ accessToken, user }` et
 * mémorise le jeton ; le backend fait tourner le cookie au passage.
 *
 * Un seul appel en vol à la fois (voir `singleFlightRefresh`) : deux
 * rafraîchissements concurrents présenteraient le même jeton et feraient
 * révoquer toute la session. Utilisé à la fois par la restauration de session
 * au montage (AuthProvider) et par le rejeu automatique sur 401.
 */
export function refreshSession(): Promise<LoginResponse> {
  return singleFlightRefresh(async () => {
    try {
      const session = await sendRequest<LoginResponse>(
        "/auth/refresh",
        { method: "POST", skipAuth: true },
        false,
      );
      setAccessToken(session.accessToken);
      return session;
    } catch (error) {
      clearAccessToken();
      notifySessionExpired();
      throw error;
    }
  });
}
