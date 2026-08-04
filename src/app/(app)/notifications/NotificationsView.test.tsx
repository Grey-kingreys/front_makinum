import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsProvider } from "@/lib/notifications";
import type { ListNotificationsParams } from "@/lib/notifications/api";
import type { NotificationListResult, NotificationView } from "@/lib/notifications/types";

const {
  listNotificationsMock,
  markNotificationReadMock,
  markAllNotificationsReadMock,
} = vi.hoisted(() => ({
  listNotificationsMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
}));

vi.mock("@/lib/notifications/api", () => ({
  listNotifications: listNotificationsMock,
  markNotificationRead: markNotificationReadMock,
  markAllNotificationsRead: markAllNotificationsReadMock,
}));

import { NotificationsView } from "./NotificationsView";

function makeNotification(overrides: Partial<NotificationView> = {}): NotificationView {
  return {
    id: "n1",
    type: "NOUVELLE_DEMANDE",
    canal: "IN_APP",
    contenu: { titre: "Nouvelle demande", message: "Vous avez reçu une nouvelle demande.", demandeId: "d1" },
    lu: false,
    dateCreation: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * `NotificationsProvider` (badge, `limit: 1`) et `NotificationsView` (liste
 * paginée) appellent toutes deux `listNotifications` au montage — un mock
 * branché sur les paramètres (plutôt que sur l'ordre des appels) évite toute
 * dépendance à l'ordre de montage des deux composants.
 */
function mockListNotifications(byPage: Record<number, NotificationListResult>) {
  listNotificationsMock.mockImplementation((params: ListNotificationsParams = {}) => {
    if (params.limit === 1) {
      // NotificationsProvider : seul nbNonLues nous intéresse ici.
      const any = Object.values(byPage)[0];
      return Promise.resolve({ items: [], total: any?.total ?? 0, nbNonLues: any?.nbNonLues ?? 0 });
    }
    return Promise.resolve(byPage[params.page ?? 1] ?? { items: [], total: 0, nbNonLues: 0 });
  });
}

function renderView() {
  return render(
    <NotificationsProvider>
      <NotificationsView />
    </NotificationsProvider>,
  );
}

describe("NotificationsView", () => {
  beforeEach(() => {
    listNotificationsMock.mockReset();
    markNotificationReadMock.mockReset();
    markAllNotificationsReadMock.mockReset();
  });

  it("shows the empty state when there is no notification", async () => {
    mockListNotifications({ 1: { items: [], total: 0, nbNonLues: 0 } });
    renderView();

    expect(await screen.findByText("Tu n'as aucune notification pour le moment.")).toBeInTheDocument();
  });

  it("renders titre/message and visually distinguishes unread notifications", async () => {
    mockListNotifications({
      1: {
        items: [
          makeNotification({ id: "n1", lu: false }),
          makeNotification({
            id: "n2",
            lu: true,
            contenu: { titre: "Demande clôturée", message: "Votre demande a été clôturée : ABOUTIE." },
          }),
        ],
        total: 2,
        nbNonLues: 1,
      },
    });
    renderView();

    expect(await screen.findByText("Nouvelle demande")).toBeInTheDocument();
    expect(screen.getByText("Vous avez reçu une nouvelle demande.")).toBeInTheDocument();
    expect(screen.getByText("Demande clôturée")).toBeInTheDocument();
    expect(screen.getAllByText("non lue")).toHaveLength(1);
  });

  it("clicking an unread notification (no demandeId) marks it read via a button, no navigation link", async () => {
    const user = userEvent.setup();
    mockListNotifications({
      1: {
        items: [
          makeNotification({
            id: "n1",
            lu: false,
            contenu: { titre: "Avertissement", message: "Merci de respecter les règles." },
          }),
        ],
        total: 1,
        nbNonLues: 1,
      },
    });
    markNotificationReadMock.mockResolvedValueOnce(
      makeNotification({
        id: "n1",
        lu: true,
        contenu: { titre: "Avertissement", message: "Merci de respecter les règles." },
      }),
    );

    renderView();
    await screen.findByText("Avertissement");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Avertissement/ }));

    await waitFor(() => expect(markNotificationReadMock).toHaveBeenCalledWith("n1"));
    await waitFor(() => expect(screen.queryByText("non lue")).not.toBeInTheDocument());
  });

  it("links to /demandes/:id when the contenu carries a demandeId", async () => {
    mockListNotifications({
      1: { items: [makeNotification({ id: "n1", lu: false })], total: 1, nbNonLues: 1 },
    });
    markNotificationReadMock.mockResolvedValueOnce(makeNotification({ id: "n1", lu: true }));

    renderView();

    const link = await screen.findByRole("link", { name: /Nouvelle demande/ });
    expect(link).toHaveAttribute("href", "/demandes/d1");
  });

  it("« Tout marquer lu » marks every notification read and hides the button", async () => {
    const user = userEvent.setup();
    mockListNotifications({
      1: {
        items: [
          makeNotification({ id: "n1", lu: false }),
          makeNotification({ id: "n2", lu: false, contenu: { titre: "Autre", message: "Message." } }),
        ],
        total: 2,
        nbNonLues: 2,
      },
    });
    markAllNotificationsReadMock.mockResolvedValueOnce({ nombre: 2 });

    renderView();
    await screen.findByText("Nouvelle demande");
    expect(screen.getAllByText("non lue")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Tout marquer lu" }));

    await waitFor(() => expect(markAllNotificationsReadMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("non lue")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tout marquer lu" })).not.toBeInTheDocument();
  });

  it("hides « Tout marquer lu » when every notification is already read", async () => {
    mockListNotifications({
      1: { items: [makeNotification({ id: "n1", lu: true })], total: 1, nbNonLues: 0 },
    });
    renderView();

    await screen.findByText("Nouvelle demande");
    expect(screen.queryByRole("button", { name: "Tout marquer lu" })).not.toBeInTheDocument();
  });

  it("« Voir plus » appends the next page", async () => {
    const user = userEvent.setup();
    mockListNotifications({
      1: { items: [makeNotification({ id: "n1" })], total: 2, nbNonLues: 2 },
      2: {
        items: [makeNotification({ id: "n2", contenu: { titre: "Deuxième", message: "Message 2." } })],
        total: 2,
        nbNonLues: 2,
      },
    });

    renderView();
    await screen.findByText("Nouvelle demande");
    expect(screen.getByRole("button", { name: "Voir plus" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    expect(await screen.findByText("Deuxième")).toBeInTheDocument();
    expect(screen.getByText("Nouvelle demande")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });
});
