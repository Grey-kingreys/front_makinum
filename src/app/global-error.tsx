"use client";

import { useEffect } from "react";

/**
 * Limite d'erreur du layout racine (T63) : seul recours quand l'exception
 * survient dans `layout.tsx` lui-même (ex. échec d'une police Google, d'un
 * provider monté au-dessus de tout le reste) — `error.tsx` ne couvre pas ce
 * cas (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md,
 * section « Global Error »). Ce fichier **remplace** le layout racine quand
 * il s'active : il doit donc fournir ses propres balises <html>/<body> et ne
 * peut compter ni sur globals.css (Tailwind), ni sur les polices next/font
 * du layout — d'où des styles inline, volontairement sobres, plutôt que des
 * classes Tailwind.
 *
 * Aucun détail technique affiché — même consigne que error.tsx. `error` est
 * seulement journalisé en console.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          backgroundColor: "#F7F4EE",
          color: "#1A2B22",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "480px" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 700 }}>
            Un problème est survenu.
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: "14.5px" }}>Réessaie.</p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-block",
                cursor: "pointer",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#0F3D2E",
                color: "#F7F4EE",
                padding: "12px 20px",
                fontSize: "14.5px",
                fontWeight: 600,
              }}
            >
              Réessayer
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error remplace le layout racine : le contexte du routeur Next n'est pas garanti disponible (erreur survenue dans le layout lui-même), une ancre HTML brute est le choix documenté (node_modules/next/dist/docs/.../error.md, section « Global Error »). */}
            <a
              href="/"
              style={{
                display: "inline-block",
                borderRadius: "10px",
                border: "1px solid #D8D0C2",
                backgroundColor: "#FFFFFF",
                color: "#1A2B22",
                padding: "12px 20px",
                fontSize: "14.5px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
