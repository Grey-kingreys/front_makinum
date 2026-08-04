import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { ReviewForm } from "./ReviewForm";

const { createReviewMock } = vi.hoisted(() => ({ createReviewMock: vi.fn() }));

vi.mock("@/lib/reviews/api", () => ({ createReview: createReviewMock }));

function renderForm(overrides: Partial<Parameters<typeof ReviewForm>[0]> = {}) {
  const onSubmitted = vi.fn();
  const onAlreadyExists = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ReviewForm
      purchaseRequestId="d1"
      onSubmitted={onSubmitted}
      onAlreadyExists={onAlreadyExists}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { ...utils, onSubmitted, onAlreadyExists, onCancel };
}

describe("ReviewForm", () => {
  beforeEach(() => {
    createReviewMock.mockReset();
  });

  it("requires a note before submitting — the API is not called", async () => {
    const user = userEvent.setup();
    const { onSubmitted } = renderForm();

    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(createReviewMock).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.getByText("Choisis une note avant d'envoyer ton avis.")).toBeInTheDocument();
  });

  it("submits { purchaseRequestId, note, commentaire } and reports success", async () => {
    const user = userEvent.setup();
    const review = {
      id: "r1",
      purchaseRequestId: "d1",
      vendeurId: "v1",
      produitId: "p1",
      note: 5,
      commentaire: "Impeccable",
      dateCreation: "2026-08-04T00:00:00.000Z",
      auteur: { nom: "Moi" },
      produit: { titre: "Sac" },
    };
    createReviewMock.mockResolvedValueOnce(review);
    const { onSubmitted } = renderForm();

    await user.click(screen.getByRole("radio", { name: "5 étoiles" }));
    await user.type(screen.getByLabelText("Commentaire (optionnel)"), "Impeccable");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() =>
      expect(createReviewMock).toHaveBeenCalledWith({
        purchaseRequestId: "d1",
        note: 5,
        commentaire: "Impeccable",
      }),
    );
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(review));
  });

  it("omits commentaire from the payload when left blank", async () => {
    const user = userEvent.setup();
    createReviewMock.mockResolvedValueOnce({
      id: "r1",
      purchaseRequestId: "d1",
      vendeurId: "v1",
      produitId: "p1",
      note: 3,
      commentaire: null,
      dateCreation: "2026-08-04T00:00:00.000Z",
      auteur: { nom: "Moi" },
      produit: null,
    });
    renderForm();

    await user.click(screen.getByRole("radio", { name: "3 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() =>
      expect(createReviewMock).toHaveBeenCalledWith({ purchaseRequestId: "d1", note: 3 }),
    );
  });

  it("calls onAlreadyExists on REVIEW_ALREADY_EXISTS without showing an inline error", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Un avis a déjà été déposé pour cette demande", "REVIEW_ALREADY_EXISTS"),
    );
    const { onAlreadyExists } = renderForm();

    await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() => expect(onAlreadyExists).toHaveBeenCalledTimes(1));
  });

  it("shows a message for REQUEST_NOT_CLOSED and keeps the form open", async () => {
    const user = userEvent.setup();
    createReviewMock.mockRejectedValueOnce(
      new ApiError(409, "Demande non clôturée", "REQUEST_NOT_CLOSED"),
    );
    const { onSubmitted, onAlreadyExists } = renderForm();

    await user.click(screen.getByRole("radio", { name: "2 étoiles" }));
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(await screen.findByText(/n'est pas encore clôturée/)).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(onAlreadyExists).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Publier mon avis" })).toBeInTheDocument();
  });

  it("calls onCancel when « Plus tard » is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole("button", { name: "Plus tard" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
