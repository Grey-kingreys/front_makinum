/**
 * Données structurées JSON-LD (T53), injectées côté serveur en
 * `<script type="application/ld+json">` sur les fiches produit et vendeur.
 *
 * `escapeJsonLdForScript` neutralise `<`, `>` et `&` : sans ça, un titre de
 * produit contenant littéralement `</script>` fermerait la balise et
 * injecterait du HTML/JS arbitraire dans la page (le JSON reste valide côté
 * `JSON.parse`, ces caractères n'ont pas de sens spécial en JSON — seule leur
 * lecture par le tokenizer HTML pose problème).
 */
export function escapeJsonLdForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Composant Server Component : rend un bloc `<script type="application/ld+json">` échappé. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLdForScript(data) }}
    />
  );
}
