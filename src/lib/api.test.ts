import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError, getApiBaseUrl, refreshSession } from "@/lib/api";
import {
  getAccessToken,
  onSessionExpired,
  resetSession,
  setAccessToken,
} from "@/lib/auth/session";
import type { PublicUser } from "@/lib/auth/types";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function unauthorized(code = "UNAUTHORIZED", message = "Non authentifié"): Response {
  return jsonResponse({ code, message }, { ok: false, status: 401 });
}

const DEMO_USER: PublicUser = {
  id: "u1",
  nom: "Fatoumata Bangoura",
  telephone: "+224622000000",
  telephoneVerifie: true,
  email: null,
  emailVerifie: false,
  role: "ACHETEUR",
  statutVendeur: "LIBRE",
  statutCompte: "ACTIF",
  vendeurValide: true,
  autoriseAdminPublication: false,
  latitude: null,
  longitude: null,
};

/** Promesse pilotée à la main : garde un rafraîchissement « en vol ». */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Vide la file de microtâches (les chaînes de promesses en attente). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function pathOf(url: unknown): string {
  return String(url).replace(getApiBaseUrl(), "");
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSession();
  });

  it("uses NEXT_PUBLIC_API_URL as the default base URL", () => {
    expect(getApiBaseUrl()).toBe(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
  });

  it("resolves with the parsed JSON body on success", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ hello: "world" }));

    const data = await apiFetch<{ hello: string }>("/ping");

    expect(data).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/ping`);
  });

  it("sends every request with credentials: include (cookie de rafraîchissement)", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/ping");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });

  it("throws an ApiError carrying the backend status/code/message on failure", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect" },
        { ok: false, status: 401 },
      ),
    );

    const promise = apiFetch("/auth/login", { method: "POST", body: {} });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Identifiant ou mot de passe incorrect",
    });
  });

  it("surfaces PHONE_NOT_VERIFIED / ACCOUNT_SUSPENDED style backend errors", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { code: "PHONE_NOT_VERIFIED", message: "Numéro de téléphone non vérifié" },
        { ok: false, status: 403 },
      ),
    );

    await expect(apiFetch("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 403,
      code: "PHONE_NOT_VERIFIED",
    });
  });

  it("falls back to a generic ApiError when the network request itself fails", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiFetch("/ping")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("injects the Authorization: Bearer header from the in-memory access token", async () => {
    setAccessToken("test-token-123");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "u1" }));

    await apiFetch("/auth/me");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token-123");
  });

  it("does not inject Authorization when no token is held in memory", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/public/ping");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("skips the Authorization header when skipAuth is set, even with a token in memory", async () => {
    setAccessToken("test-token-123");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "x", user: {} }));

    await apiFetch("/auth/login", { method: "POST", body: {}, skipAuth: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("passes a FormData body through unserialized, without forcing a Content-Type", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "photo-1" }));

    const formData = new FormData();
    formData.append("photo", new File(["binary"], "photo.jpg", { type: "image/jpeg" }));

    await apiFetch("/products/p1/photos", { method: "POST", body: formData });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(formData);
    const headers = init.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });
});

describe("apiFetch — renouvellement automatique du jeton sur 401", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSession();
  });

  it("rafraîchit le jeton puis rejoue la requête d'origine avec le nouveau jeton", async () => {
    setAccessToken("stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown, init: RequestInit) => {
      const path = pathOf(url);
      if (path === "/auth/refresh") {
        return jsonResponse({ accessToken: "fresh-token", user: DEMO_USER });
      }
      const auth = (init.headers as Headers).get("Authorization");
      return auth === "Bearer fresh-token"
        ? jsonResponse({ items: ["d1"] })
        : unauthorized();
    });

    await expect(apiFetch("/demandes?vue=acheteur")).resolves.toEqual({ items: ["d1"] });

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls.map(([url]) => pathOf(url))).toEqual([
      "/demandes?vue=acheteur",
      "/auth/refresh",
      "/demandes?vue=acheteur",
    ]);
    // Le rafraîchissement part sans corps, sans Authorization, avec le cookie.
    const [, refreshInit] = calls[1];
    expect(refreshInit.method).toBe("POST");
    expect(refreshInit.body).toBeUndefined();
    expect(refreshInit.credentials).toBe("include");
    expect((refreshInit.headers as Headers).has("Authorization")).toBe(false);
    // Le rejeu porte le jeton fraîchement obtenu, désormais en mémoire.
    expect((calls[2][1].headers as Headers).get("Authorization")).toBe("Bearer fresh-token");
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("ne déclenche qu'UN SEUL rafraîchissement quand plusieurs requêtes échouent en 401 en même temps", async () => {
    setAccessToken("stale-token");
    const gate = deferred<Response>();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown, init: RequestInit) => {
      const path = pathOf(url);
      // Le rafraîchissement reste en vol tant qu'on n'ouvre pas la barrière :
      // les trois requêtes ont donc toutes le temps d'échouer en 401 avant
      // qu'il n'aboutisse.
      if (path === "/auth/refresh") return gate.promise;
      const auth = (init.headers as Headers).get("Authorization");
      return auth === "Bearer fresh-token" ? jsonResponse({ path }) : unauthorized();
    });

    const inFlight = Promise.all([
      apiFetch("/demandes"),
      apiFetch("/notifications"),
      apiFetch("/produits"),
    ]);

    await tick();

    const refreshCallsWhileQueued = (fetchMock.mock.calls as [string][]).filter(
      ([url]) => pathOf(url) === "/auth/refresh",
    );
    // Le cœur de T28 : rotation côté backend — deux rafraîchissements
    // concurrents feraient passer le second pour une réutilisation
    // frauduleuse et révoqueraient toute la session.
    expect(refreshCallsWhileQueued).toHaveLength(1);

    gate.resolve(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));

    await expect(inFlight).resolves.toEqual([
      { path: "/demandes" },
      { path: "/notifications" },
      { path: "/produits" },
    ]);

    const paths = (fetchMock.mock.calls as [string][]).map(([url]) => pathOf(url));
    expect(paths.filter((path) => path === "/auth/refresh")).toHaveLength(1);
    // 3 requêtes en 401 + 1 rafraîchissement + 3 rejeux.
    expect(paths).toHaveLength(7);
  });

  it("n'ouvre qu'un seul appel réseau quand refreshSession() est invoqué en parallèle", async () => {
    const gate = deferred<Response>();
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async () => gate.promise);

    const all = Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    gate.resolve(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));
    const [a, b, c] = await all;

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("libère la file : un rafraîchissement ultérieur repart bien en réseau", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(jsonResponse({ accessToken: "fresh-token", user: DEMO_USER }));

    await refreshSession();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propage l'échec du rafraîchissement et bascule l'application en déconnecté", async () => {
    setAccessToken("stale-token");
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown) =>
      pathOf(url) === "/auth/refresh"
        ? unauthorized("INVALID_REFRESH_TOKEN", "Session expirée")
        : unauthorized(),
    );

    await expect(apiFetch("/demandes")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });

    // Aucune boucle : la requête d'origine + un unique rafraîchissement.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    unsubscribe();
  });

  it("ne tente aucun rafraîchissement sur un 401 de /auth/login", async () => {
    setAccessToken("stale-token");
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect" },
        { ok: false, status: 401 },
      ),
    );

    await expect(
      apiFetch("/auth/login", {
        method: "POST",
        body: { identifiant: "+224622000000", motDePasse: "faux" },
        skipAuth: true,
      }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pathOf((fetchMock.mock.calls[0] as [string])[0])).toBe("/auth/login");
    expect(expired).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("ne tente aucun rafraîchissement sur /auth/login même sans skipAuth", async () => {
    setAccessToken("stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(unauthorized("INVALID_CREDENTIALS"));

    await expect(apiFetch("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne tente aucun rafraîchissement sur un 401 de /auth/logout", async () => {
    setAccessToken("stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(unauthorized());

    await expect(apiFetch("/auth/logout", { method: "POST" })).rejects.toMatchObject({
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne rafraîchit pas sur un 401 d'une requête volontairement anonyme (skipAuth)", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(unauthorized());

    await expect(apiFetch("/produits", { skipAuth: true })).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne rafraîchit pas sur les erreurs autres que 401 (403, 500…)", async () => {
    setAccessToken("stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "FORBIDDEN", message: "Accès refusé" }, { ok: false, status: 403 }),
    );

    await expect(apiFetch("/admin/vendeurs")).rejects.toMatchObject({ status: 403 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne rejoue la requête qu'une seule fois, même si le rejeu échoue encore en 401", async () => {
    setAccessToken("stale-token");
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockImplementation(async (url: unknown) =>
      pathOf(url) === "/auth/refresh"
        ? jsonResponse({ accessToken: "fresh-token", user: DEMO_USER })
        : unauthorized(),
    );

    await expect(apiFetch("/demandes")).rejects.toMatchObject({ status: 401 });

    // 401 initial + rafraîchissement + rejeu, et on s'arrête là.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
