import type { NextConfig } from "next";
import path from "path";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    if (!API_URL || API_URL.startsWith("/")) {
      return [];
    }
    return [
      {
        source: "/health",
        destination: `${API_URL}/health`,
      },
      {
        source: "/api/health",
        destination: `${API_URL}/api/health`,
      },
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
