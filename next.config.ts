import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// @serwist/next warns under `next dev --turbopack` even though it's already
// disabled outside production (disable below) — this is cosmetic, not a bug.
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

const nextConfig: NextConfig = {
  // @serwist/next always injects a webpack() config (even when `disable` is
  // true below), which Next 16's Turbopack dev server otherwise flags as a
  // likely mistake. This acknowledges it's intentional.
  turbopack: {},
  experimental: {
    // Dynamic pages have 0s client-router cache to guarantee fresh data on
    // navigation after mutations, while prefetched static routes retain 180s.
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
