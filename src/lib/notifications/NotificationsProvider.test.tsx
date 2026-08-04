import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listNotificationsMock } = vi.hoisted(() => ({
  listNotificationsMock: vi.fn(),
}));

vi.mock("./api", () => ({ listNotifications: listNotificationsMock }));

// Import after the mock so NotificationsProvider picks up the mocked module.
import { NotificationsProvider, useNotifications } from "./NotificationsProvider";

function Harness() {
  const { nbNonLues, loading, error, refresh } = useNotifications();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <span data-testid="nbNonLues">{nbNonLues}</span>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
}

describe("NotificationsProvider", () => {
  beforeEach(() => {
    listNotificationsMock.mockReset();
  });

  it("fetches nbNonLues on mount with limit: 1", async () => {
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 5, nbNonLues: 3 });

    render(
      <NotificationsProvider>
        <Harness />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("nbNonLues")).toHaveTextContent("3");
    expect(listNotificationsMock).toHaveBeenCalledWith({ limit: 1 });
  });

  it("exposes an error message when the fetch fails, and 0 for nbNonLues", async () => {
    listNotificationsMock.mockRejectedValueOnce(new Error("boom"));

    render(
      <NotificationsProvider>
        <Harness />
      </NotificationsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Impossible de charger tes notifications"),
    );
    expect(screen.getByTestId("nbNonLues")).toHaveTextContent("0");
  });

  it("refresh() re-fetches and updates the shared count", async () => {
    const user = userEvent.setup();
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 1, nbNonLues: 1 });
    listNotificationsMock.mockResolvedValueOnce({ items: [], total: 1, nbNonLues: 0 });

    render(
      <NotificationsProvider>
        <Harness />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("nbNonLues")).toHaveTextContent("1"));
    await user.click(screen.getByText("refresh"));
    await waitFor(() => expect(screen.getByTestId("nbNonLues")).toHaveTextContent("0"));
    expect(listNotificationsMock).toHaveBeenCalledTimes(2);
  });
});
