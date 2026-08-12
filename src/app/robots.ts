import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo/config";

/**
 * `robots.txt` (T53) : le catalogue public (T51) est indexable, tout ce qui
 * suppose une session (dashboard, espace vendeur, admin, écrans d'auth) ne
 * l'est pas — ceinture et bretelles avec le `robots: { index: false, follow:
 * false }` posé en metadata sur les pages d'auth elles-mêmes (T53 ⑧). Next
 * fait du préfixe : `allow: "/produits"` couvre aussi `/produits/[id]`, idem
 * pour `/vendeurs`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/produits", "/vendeurs", "/cgu", "/confidentialite"],
      disallow: [
        "/dashboard",
        "/demandes",
        "/notifications",
        "/vendeur/",
        "/admin/",
        "/devenir-vendeur",
        "/connexion",
        "/inscription",
        "/recuperation",
        "/verification",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
