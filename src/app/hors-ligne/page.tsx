import type { Metadata } from "next";

import { HorsLigneView } from "./HorsLigneView";

/**
 * Page de repli hors ligne (T67①). Hors du groupe (app) — comme /cgu et
 * /confidentialite — pour rester consultable sans session : AppShell exige
 * une session restaurée sur toute route protégée, ce qui la rendrait
 * inutilisable au moment précis où on en a besoin (réseau coupé, impossible
 * de confirmer une session). Server Component statique, sans dépendance à
 * l'API : precachée telle quelle par `public/sw.js` à l'installation, puis
 * servie par le service worker en repli quand une navigation échoue faute de
 * réseau (voir le commentaire de l'écouteur `fetch` du service worker).
 */
export const metadata: Metadata = {
  title: "Hors connexion",
  description: "Aucune connexion réseau détectée.",
  robots: { index: false, follow: false },
};

export default function HorsLignePage() {
  return <HorsLigneView />;
}
