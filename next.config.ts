import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is personalized (session cookie) and the pipeline is realtime, so PPR /
  // cache components buy nothing here and would only add Suspense plumbing.
  // Revisit if the marketing pages ever need static generation at scale.
  cacheComponents: false,
  partialPrefetching: false,
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
