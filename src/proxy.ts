import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveLegacyRedirectTarget } from "@/lib/legacy-redirect";

/**
 * T61a — migration de domaine makinum.kingreys.fr → makinum.com.
 *
 * Convention Next.js 16 : `middleware.ts` est dépréciée et renommée
 * `proxy.ts` (voir
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 * et .../02-guides/upgrading/version-16.md, section « middleware to proxy »).
 *
 * La décision (hôte legacy matché → URL cible, ou pas de redirection) vit
 * dans la fonction pure `resolveLegacyRedirectTarget` (src/lib/legacy-redirect.ts),
 * testée hors runtime Next. Ici on se contente de brancher les en-têtes de
 * la requête réelle dessus.
 *
 * No-op strict si `LEGACY_REDIRECT_HOSTS` ou `NEXT_PUBLIC_SITE_URL` est
 * absent : `resolveLegacyRedirectTarget` renvoie `null`, on laisse alors
 * passer la requête sans aucun effet de bord (dev local et déploiements sans
 * ces variables restent inchangés).
 */
export function proxy(request: NextRequest) {
  const target = resolveLegacyRedirectTarget({
    requestHost: request.headers.get("host"),
    pathWithQuery: request.nextUrl.pathname + request.nextUrl.search,
    legacyHostsEnv: process.env.LEGACY_REDIRECT_HOSTS,
    siteUrlEnv: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!target) return NextResponse.next();

  // 308 : redirection permanente qui préserve la méthode HTTP d'origine
  // (contrairement à 301/302/303, requis par la spec pour ne pas casser un
  // éventuel POST fait vers l'ancien domaine).
  return NextResponse.redirect(target, 308);
}

/**
 * Exclut les chemins internes (`_next/*`) et les assets statiques : ils sont
 * servis à l'identique quel que soit l'hôte, les rediriger n'apporte rien et
 * peut casser des requêtes d'assets déjà en vol pendant la bascule de
 * domaine.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|otf)$).*)",
  ],
};
