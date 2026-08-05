import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Build autonome pour l'image Docker (voir Dockerfile) : Next copie dans
   * `.next/standalone` un serveur minimal `server.js` et les seuls modules de
   * `node_modules` réellement tracés. L'image de runtime n'a donc besoin
   * d'aucun `npm install`.
   *
   * `public/` et `.next/static` ne sont PAS copiés automatiquement dans
   * `standalone` : le Dockerfile les recopie explicitement (sans quoi les
   * icônes PWA, le manifeste et les bundles JS renvoient 404).
   *
   * Sans effet sur `next dev` : le développement local est inchangé.
   */
  output: "standalone",
};

export default nextConfig;
