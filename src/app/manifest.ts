import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Makinum",
    short_name: "Makinum",
    description: "Trouve ce qui se vend près de chez toi, sans intermédiaire.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EE",
    theme_color: "#0F3D2E",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
