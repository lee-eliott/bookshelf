import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bookshelf",
    short_name: "Bookshelf",
    description: "Ma bibliothèque virtuelle",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#B45309",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
