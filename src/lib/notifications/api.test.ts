import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiBaseUrl } from "@/lib/api";
import { resetSession } from "@/lib/auth/session";

import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("notifications/api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    resetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listNotifications() calls GET /notifications with page/limit/lu", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0, nbNonLues: 0 }));

    await listNotifications({ page: 2, limit: 10, lu: false });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/notifications?page=2&limit=10&lu=false`);
    expect(init.method).toBe("GET");
  });

  it("listNotifications() omits the query string when no params are given", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0, nbNonLues: 0 }));

    await listNotifications();

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/notifications`);
  });

  it("markNotificationRead() calls PATCH /notifications/:id/lu", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "n1", lu: true }));

    await markNotificationRead("n1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/notifications/n1/lu`);
    expect(init.method).toBe("PATCH");
  });

  it("markAllNotificationsRead() calls PATCH /notifications/lu", async () => {
    const fetchMock = fetch as unknown as FetchMock;
    fetchMock.mockResolvedValueOnce(jsonResponse({ nombre: 3 }));

    const result = await markAllNotificationsRead();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBaseUrl()}/notifications/lu`);
    expect(init.method).toBe("PATCH");
    expect(result).toEqual({ nombre: 3 });
  });
});
