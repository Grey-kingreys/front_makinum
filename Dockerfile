# syntax=docker/dockerfile:1

# =============================================================================
# Makinum — PWA Next.js 16. Image de production, build multi-stage.
# Cible : Dokploy (le build est exécuté sur le serveur, depuis ce dépôt).
#
# -----------------------------------------------------------------------------
#  ⚠️  PIÈGE N°1 DE CE DÉPLOIEMENT : NEXT_PUBLIC_API_URL EST UNE VARIABLE DE
#      BUILD, PAS UNE VARIABLE DE RUNTIME.
# -----------------------------------------------------------------------------
#  Next.js *inline* la valeur de toute variable `NEXT_PUBLIC_*` dans les
#  bundles JavaScript AU MOMENT DE `next build`. Après le build, la chaîne est
#  gravée dans les fichiers de `.next/static` : la redéfinir au démarrage du
#  conteneur n'a AUCUN effet sur le code exécuté par le navigateur.
#
#  Conséquence concrète dans Dokploy : NEXT_PUBLIC_API_URL doit être renseignée
#  dans **Build Args** (onglet Build / « Build Arguments ») du service frontend.
#  La mettre dans **Environment** (variables runtime) donne une PWA qui compile,
#  démarre, s'affiche… et tape sur http://localhost:4000 depuis le navigateur
#  du visiteur — donc « Failed to fetch » sur tous les écrans.
#
#  Corollaire : changer l'URL de l'API impose un REBUILD de l'image, pas un
#  simple redémarrage.
#
#  Le `RUN test -n` du stage build ci-dessous fait échouer le build tôt et
#  bruyamment plutôt que de produire une image silencieusement cassée.
# =============================================================================

# --- 1. Dépendances ----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 2. Build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Valeur inlinée dans les bundles client — voir l'avertissement ci-dessus.
# Exemple : --build-arg NEXT_PUBLIC_API_URL=https://api.makinum.example
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN test -n "$NEXT_PUBLIC_API_URL" || { \
  echo ""; \
  echo "ERREUR : NEXT_PUBLIC_API_URL est vide."; \
  echo "Cette variable est inlinée dans les bundles au moment du build ; une"; \
  echo "image construite sans elle pointerait sur http://localhost:4000 chez"; \
  echo "tous les visiteurs. Dans Dokploy : renseignez-la en BUILD ARG."; \
  echo "En local : docker build --build-arg NEXT_PUBLIC_API_URL=https://…"; \
  echo ""; \
  exit 1; }

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- 3. Runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# server.js écoute sur HOSTNAME : sans 0.0.0.0, le serveur ne serait joignable
# que depuis l'intérieur du conteneur (ni Traefik, ni les autres services).
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# `output: 'standalone'` (next.config.ts) produit un serveur autonome : aucun
# node_modules à installer ici. En revanche, `public/` et `.next/static` ne
# sont PAS inclus par Next dans standalone — il faut les recopier à la main.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
