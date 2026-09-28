import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Limit to 1 CPU worker — prevents Rust/rayon thread crash on shared hosting
  experimental: {
    cpus: 1,
  },
  poweredByHeader: false,
};

export default nextConfig;
