import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsProvider } from "@/lib/notifications";

const { usePathnameMock, listNotificationsMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/produits"),
  listNotificationsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));
vi.mock("@/lib/notifications/api", () => ({ listNotifications: listNotificationsMock }));

import { NotificationBell } from "./NotificationBell";

function renderBell() {
  return render(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/produits");
    listNotificationsMock.mockReset();
  });

  it("hides the badge when there are no unread notifications", async () => {
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 0, nbNonLues: 0 });
    renderBell();

    const link = await screen.findByRole("link", { name: "Notifications" });
    expect(link).toHaveAttribute("href", "/notifications");
    expect(link.textContent).toBe("");
  });

  it("shows the unread count as a badge", async () => {
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 5, nbNonLues: 4 });
    renderBell();

    const link = await screen.findByRole("link", { name: "Notifications, 4 non lues" });
    expect(link).toHaveTextContent("4");
  });

  it("caps the badge display at 99+", async () => {
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 200, nbNonLues: 150 });
    renderBell();

    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("marks itself as the current page on /notifications", async () => {
    usePathnameMock.mockReturnValue("/notifications");
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 0, nbNonLues: 0 });
    renderBell();

    const link = await screen.findByRole("link", { name: "Notifications" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
