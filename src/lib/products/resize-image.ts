/**
 * Redimensionnement client d'une photo produit avant envoi (T40) : sur mobile,
 * une photo de plusieurs Mo peut se faire couper par l'infra en cours de
 * transfert (voir docs/plans/ACTIVE.md) avant même d'atteindre l'API. On
 * réduit donc le côté le plus long à {@link MAX_DIMENSION_PX} et on réencode
 * en JPEG via `createImageBitmap` + `canvas.toBlob` (API navigateur standard,
 * aucune dépendance ajoutée) — pure optimisation de transport, pas une
 * garantie de sécurité : le backend refait son propre traitement (sharp).
 *
 * On ne redimensionne jamais à la hausse : une image déjà sous la limite est
 * renvoyée telle quelle. Si le redimensionnement échoue pour une raison
 * quelconque (format exotique, `createImageBitmap` indisponible, canvas
 * vide…), on ne bloque pas l'envoi : on se rabat silencieusement sur le
 * fichier d'origine.
 */

const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Redimensionne `file` si nécessaire et renvoie un JPEG (même nom de
 * fichier). En cas d'échec de n'importe quelle étape, renvoie `file` inchangé
 * — jamais de rejet.
 */
export async function resizeImageFile(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap !== "function") return file;

    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = bitmap;
      const largestSide = Math.max(width, height);
      if (!largestSide || largestSide <= MAX_DIMENSION_PX) {
        return file;
      }

      const scale = MAX_DIMENSION_PX / largestSide;
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) return file;

      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
      });
      if (!blob || blob.size === 0) return file;

      return new File([blob], file.name, { type: "image/jpeg" });
    } finally {
      bitmap.close?.();
    }
  } catch {
    return file;
  }
}
