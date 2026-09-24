import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MatruSetu",
    short_name: "MatruSetu",
    description: "Assistive pregnancy tracking and OPD digitisation for OB-GYN practices.",
    start_url: "/today",
    display: "standalone",
    background_color: "#fffefc",
    theme_color: "#0f3e17",
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
