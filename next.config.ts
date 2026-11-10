import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets local verification use a separate output folder while `next dev`
  // keeps its active `.next` directory open.
  distDir: process.env.NEXT_BUILD_OUTPUT_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
