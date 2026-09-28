import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...(process.env.NEXT_PUBLIC_DEV_ORIGIN ? [process.env.NEXT_PUBLIC_DEV_ORIGIN] : []),
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default function config(phase: string): NextConfig {
  // Fail the build loudly: MSW must never ship enabled in a production bundle.
  if (phase === PHASE_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    throw new Error(
      "NEXT_PUBLIC_USE_MOCKS must be unset for production builds (msw would intercept real API traffic)."
    );
  }
  return nextConfig;
}
