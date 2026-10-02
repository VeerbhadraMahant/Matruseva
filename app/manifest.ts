import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MatruSetu",
    short_name: "MatruSetu",
    description: "Assistive pregnancy tracking and OPD digitisation for OB-GYN practices.",
    start_url: "/today",
    display: "standalone",
    background_color: "#faf6ec",
    theme_color: "#3e2a5c",
    icons: [
      {
        src: "/logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
