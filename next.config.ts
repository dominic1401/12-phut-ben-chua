import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["terminal.local"],
  env: {
    NEXT_PUBLIC_AUDIO_PREVIEW: process.env.VERCEL_ENV === "preview"
      || process.env.NODE_ENV !== "production" ? "true" : "false",
  },
};

export default nextConfig;
