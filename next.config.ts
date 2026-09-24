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
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
