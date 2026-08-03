import { getToken } from "@/lib/auth/token";

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
  /** Sérialisé en JSON automatiquement (Content-Type appliqué si absent). */
  body?: unknown;
  /** N'injecte pas l'en-tête Authorization même si un jeton est présent. */
  skipAuth?: boolean;
}

/**
 * Wrapper fetch générique vers l'API Makinum : sérialise le corps en JSON,
 * injecte `Authorization: Bearer <token>` si une session est active, et lève
 * une {@link ApiError} typée en cas d'échec.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, skipAuth = false, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur Makinum.", "NETWORK_ERROR");
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(data, `Erreur ${response.status}`),
      extractErrorCode(data),
    );
  }

  return data as T;
}
