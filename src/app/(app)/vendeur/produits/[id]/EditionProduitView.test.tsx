import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { GeoProvider } from "@/lib/geo";
import type { ProductPhotoView, ProductView } from "@/lib/products/types";

import { EditionProduitView } from "./EditionProduitView";

const {
  getProductMock,
  listCategoriesMock,
  updateProductMock,
  addProductPhotoMock,
  deleteProductPhotoMock,
  reorderProductPhotosMock,
  resizeImageFileMock,
} = vi.hoisted(() => ({
  getProductMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  updateProductMock: vi.fn(),
  addProductPhotoMock: vi.fn(),
  deleteProductPhotoMock: vi.fn(),
  reorderProductPhotosMock: vi.fn(),
  resizeImageFileMock: vi.fn(),
}));

vi.mock("@/lib/products/api", () => ({ getProduct: getProductMock }));
vi.mock("@/lib/categories/api", () => ({ listCategories: listCategoriesMock }));
vi.mock("@/lib/products/vendor-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/products/vendor-api")>("@/lib/products/vendor-api");
  return {
    ...actual,
    updateProduct: updateProductMock,
    addProductPhoto: addProductPhotoMock,
    deleteProductPhoto: deleteProductPhotoMock,
    reorderProductPhotos: reorderProductPhotosMock,
  };
});
// Le redimensionnement lui-même (createImageBitmap/canvas) est couvert par
// src/lib/products/resize-image.test.ts — ici on vérifie seulement le
// câblage : appelé avant addProductPhoto, avec le fichier qu'il renvoie.
vi.mock("@/lib/products/resize-image", () => ({ resizeImageFile: resizeImageFileMock }));

const CATEGORIES = [
  { id: "c1", nom: "Mode & tissus", slug: "mode-tissus", parentId: null },
  { id: "c2", nom: "Alimentation", slug: "alimentation", parentId: null },
];

function makePhoto(overrides: Partial<ProductPhotoView> = {}): ProductPhotoView {
  return { id: "ph1", url: "https://cdn.example/ph1.jpg", urlMiniature: "https://cdn.example/ph1-min.jpg", ordre: 1, ...overrides };
}

function makeProduct(overrides: Partial<ProductView> = {}): ProductView {
  return {
    id: "p1",
    titre: "Pagne wax 6 yards",
    description: "Tissu wax authentique.",
    prix: "185000",
    categorieId: "c1",
    vendeurId: "v1",
    latitude: null,
    longitude: null,
    actif: true,
    dateCreation: "2026-08-01T00:00:00.000Z",
    dateMiseAJour: "2026-08-01T00:00:00.000Z",
    categorie: { id: "c1", nom: "Mode & tissus", slug: "mode-tissus" },
    vendeur: { id: "v1", nom: "Fatoumata Bangoura", statutVendeur: "VERIFIE" },
    photos: [],
    ...overrides,
  };
}

function renderView(productId = "p1") {
  return render(
    <GeoProvider>
      <EditionProduitView productId={productId} />
    </GeoProvider>,
  );
}

// URL.createObjectURL/revokeObjectURL are not implemented in jsdom.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("EditionProduitView", () => {
  beforeEach(() => {
    getProductMock.mockReset();
    listCategoriesMock.mockReset();
    updateProductMock.mockReset();
    addProductPhotoMock.mockReset();
    deleteProductPhotoMock.mockReset();
    reorderProductPhotosMock.mockReset();
    resizeImageFileMock.mockReset();
    // Par défaut, passe le fichier tel quel (comportement de repli réel de
    // resize-image.ts quand aucun test ne cherche à observer autre chose).
    resizeImageFileMock.mockImplementation((file: File) => Promise.resolve(file));
    listCategoriesMock.mockResolvedValue(CATEGORIES);
  });

  it("pre-fills the form from the loaded product", async () => {
    getProductMock.mockResolvedValueOnce(makeProduct());
    renderView();

    expect(await screen.findByLabelText("Titre du produit")).toHaveValue("Pagne wax 6 yards");
    expect(screen.getByLabelText("Description")).toHaveValue("Tissu wax authentique.");
    expect(screen.getByLabelText("Catégorie")).toHaveValue("c1");
    expect(getProductMock).toHaveBeenCalledWith("p1");
  });

  it("shows a not-found message when the product doesn't exist", async () => {
    getProductMock.mockRejectedValueOnce(new ApiError(404, "Produit introuvable", "PRODUCT_NOT_FOUND"));
    renderView();

    expect(await screen.findByText("Ce produit est introuvable.")).toBeInTheDocument();
  });

  it("PATCHes the product with the form payload on submit", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct());
    updateProductMock.mockResolvedValueOnce(makeProduct({ titre: "Pagne wax premium" }));
    renderView();

    const titreInput = await screen.findByLabelText("Titre du produit");
    await user.clear(titreInput);
    await user.type(titreInput, "Pagne wax premium");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    await waitFor(() =>
      expect(updateProductMock).toHaveBeenCalledWith("p1", {
        titre: "Pagne wax premium",
        description: "Tissu wax authentique.",
        prix: 185000,
        categorieId: "c1",
        latitude: undefined,
        longitude: undefined,
      }),
    );
    expect(await screen.findByText("Modifications enregistrées.")).toBeInTheDocument();
  });

  it("shows a clear message when the vendor account is not yet validated (VENDOR_NOT_VALIDATED)", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct());
    updateProductMock.mockRejectedValueOnce(
      new ApiError(
        403,
        "Votre compte vendeur doit être validé par un administrateur avant de publier des produits",
        "VENDOR_NOT_VALIDATED",
      ),
    );
    renderView();

    const titreInput = await screen.findByLabelText("Titre du produit");
    await user.clear(titreInput);
    await user.type(titreInput, "Pagne wax premium");
    await user.click(screen.getByRole("button", { name: "Enregistrer les modifications" }));

    expect(
      await screen.findByText(/doit être validé par un administrateur/),
    ).toBeInTheDocument();
  });

  it("renders existing photos with a counter and lets the vendor delete one", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(
      makeProduct({ photos: [makePhoto({ id: "ph1", ordre: 1 }), makePhoto({ id: "ph2", ordre: 2 })] }),
    );
    deleteProductPhotoMock.mockResolvedValueOnce(undefined);
    renderView();

    expect(await screen.findByText("2 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Supprimer la photo 1" }));

    await waitFor(() => expect(deleteProductPhotoMock).toHaveBeenCalledWith("p1", "ph1"));
    expect(await screen.findByText("1 / 10")).toBeInTheDocument();
  });

  it("reorders photos with the ← → buttons, sending the full reordered id list", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(
      makeProduct({
        photos: [
          makePhoto({ id: "ph1", ordre: 1 }),
          makePhoto({ id: "ph2", ordre: 2 }),
          makePhoto({ id: "ph3", ordre: 3 }),
        ],
      }),
    );
    reorderProductPhotosMock.mockResolvedValueOnce([
      makePhoto({ id: "ph2", ordre: 1 }),
      makePhoto({ id: "ph1", ordre: 2 }),
      makePhoto({ id: "ph3", ordre: 3 }),
    ]);
    renderView();

    await screen.findByText("3 / 10");
    await user.click(screen.getByRole("button", { name: "Déplacer la photo 1 vers la droite" }));

    await waitFor(() =>
      expect(reorderProductPhotosMock).toHaveBeenCalledWith("p1", ["ph2", "ph1", "ph3"]),
    );
  });

  it("uploads files sequentially and shows a per-file error (INVALID_IMAGE)", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct({ photos: [] }));
    addProductPhotoMock
      .mockResolvedValueOnce(makePhoto({ id: "ph-new", ordre: 1 }))
      .mockRejectedValueOnce(new ApiError(400, "Image refusée : format non supporté", "INVALID_IMAGE"));
    renderView();

    await screen.findByText("0 / 10");

    const goodFile = new File(["binary"], "photo-ok.jpg", { type: "image/jpeg" });
    // Same accepted MIME type as goodFile: the rejection this simulates
    // (INVALID_IMAGE) is a server-side check (dimensions, decoding…) that the
    // client can't pre-validate — a mismatched MIME type would instead be
    // filtered out by userEvent.upload() itself via the input's `accept`.
    const badFile = new File(["binary"], "photo-bad.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("Ajouter des photos");
    await user.upload(input, [goodFile, badFile]);

    await waitFor(() => expect(addProductPhotoMock).toHaveBeenCalledTimes(2));
    expect(addProductPhotoMock).toHaveBeenNthCalledWith(1, "p1", goodFile);
    expect(addProductPhotoMock).toHaveBeenNthCalledWith(2, "p1", badFile);

    expect(await screen.findByText("1 / 10")).toBeInTheDocument();
    expect(await screen.findByText(/Image refusée : format non supporté/)).toBeInTheDocument();
  });

  it("shows a clear message on a photo upload when the vendor account is not yet validated (VENDOR_NOT_VALIDATED)", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct({ photos: [] }));
    addProductPhotoMock.mockRejectedValueOnce(
      new ApiError(
        403,
        "Votre compte vendeur doit être validé par un administrateur avant de publier des produits",
        "VENDOR_NOT_VALIDATED",
      ),
    );
    renderView();

    await screen.findByText("0 / 10");

    const file = new File(["binary"], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("Ajouter des photos");
    await user.upload(input, [file]);

    expect(
      await screen.findByText(/doit être validé par un administrateur/),
    ).toBeInTheDocument();
  });

  it("still uploads the file when the browser empties the FileList in place as soon as `value` is reset (real-browser behavior, T42)", async () => {
    // jsdom's FileList does NOT empty itself when `input.value` is reset, so a
    // naive test here would pass whether or not the fix is applied. Real
    // browsers (Chrome 151 confirmed) return a LIVE FileList from
    // `input.files`: resetting `input.value` mutates that same list down to
    // length 0. This test fakes that live behavior on the DOM node itself so
    // it actually exercises the ordering bug: it must FAIL if the component
    // reads `event.target.files` again (or keeps a reference to it) AFTER
    // resetting `event.target.value`.
    getProductMock.mockResolvedValueOnce(makeProduct({ photos: [] }));
    addProductPhotoMock.mockResolvedValueOnce(makePhoto({ id: "ph-new", ordre: 1 }));
    renderView();

    await screen.findByText("0 / 10");

    const input = screen.getByLabelText("Ajouter des photos") as HTMLInputElement;
    const file = new File(["binary"], "photo.jpg", { type: "image/jpeg" });

    const liveFiles: File[] = [file];
    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => liveFiles,
    });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => (liveFiles.length ? "C:\\fakepath\\photo.jpg" : ""),
      set: () => {
        // Mutates the SAME array in place — any reference captured earlier
        // (e.g. `const files = event.target.files`) observes length 0 too,
        // exactly like a real live FileList.
        liveFiles.length = 0;
      },
    });

    fireEvent.change(input);

    await waitFor(() => expect(addProductPhotoMock).toHaveBeenCalledTimes(1));
    expect(addProductPhotoMock).toHaveBeenCalledWith("p1", file);
    expect(await screen.findByText("1 / 10")).toBeInTheDocument();
  });

  it("resizes each file before uploading and sends the resized file, not the original, to addProductPhoto", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct({ photos: [] }));
    const original = new File(["binary"], "photo.jpg", { type: "image/jpeg" });
    const resized = new File(["smaller-binary"], "photo.jpg", { type: "image/jpeg" });
    resizeImageFileMock.mockResolvedValueOnce(resized);
    addProductPhotoMock.mockResolvedValueOnce(makePhoto({ id: "ph-new", ordre: 1 }));
    renderView();

    await screen.findByText("0 / 10");

    const input = screen.getByLabelText("Ajouter des photos");
    await user.upload(input, [original]);

    await waitFor(() => expect(addProductPhotoMock).toHaveBeenCalledTimes(1));
    expect(resizeImageFileMock).toHaveBeenCalledWith(original);
    // `File`/`Blob` compare structurally-equal-but-empty under Vitest's deep
    // equality (their content isn't an enumerable own property), so identity
    // (`toBe`) is the only reliable way to assert *which* File instance was
    // actually transmitted.
    const [, transmittedFile] = addProductPhotoMock.mock.calls[0] as [string, File];
    expect(transmittedFile).toBe(resized);
    expect(transmittedFile).not.toBe(original);
  });

  it("shows a specific message and a Retry button when the upload fails before any HTTP response, and Retry resends it", async () => {
    const user = userEvent.setup();
    getProductMock.mockResolvedValueOnce(makeProduct({ photos: [] }));
    addProductPhotoMock
      .mockRejectedValueOnce(
        new ApiError(0, "Impossible de joindre le serveur Makinum.", "NETWORK_ERROR"),
      )
      .mockResolvedValueOnce(makePhoto({ id: "ph-new", ordre: 1 }));
    renderView();

    await screen.findByText("0 / 10");

    const file = new File(["binary"], "photo.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText("Ajouter des photos");
    await user.upload(input, [file]);

    expect(
      await screen.findByText(
        "Envoi interrompu — vérifie ta connexion, ou réessaie avec une photo plus légère.",
      ),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Réessayer" });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    await waitFor(() => expect(addProductPhotoMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("1 / 10")).toBeInTheDocument();
    expect(screen.queryByText(/Envoi interrompu/)).not.toBeInTheDocument();
  });

  it("disables the upload input and shows a message once the 10-photo limit is reached", async () => {
    getProductMock.mockResolvedValueOnce(
      makeProduct({
        photos: Array.from({ length: 10 }, (_, index) =>
          makePhoto({ id: `ph${index}`, ordre: index + 1 }),
        ),
      }),
    );
    renderView();

    expect(await screen.findByText("10 / 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Ajouter des photos")).toBeDisabled();
    expect(
      screen.getByText(/Limite de 10 photos atteinte/),
    ).toBeInTheDocument();
  });
});
