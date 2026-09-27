import type { NextConfig } from "next";
import { brandIconUrl } from "./lib/brand.mjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/favicon.svg", destination: brandIconUrl(64), permanent: false }];
  },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  allowedDevOrigins: ["terminal.local"],
  env: {
    NEXT_PUBLIC_AUDIO_PREVIEW: process.env.VERCEL_ENV === "preview"
      || process.env.NODE_ENV !== "production" ? "true" : "false",
  },
};

export default nextConfig;
