import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep development assets separate so `next build` cannot invalidate
  // styles served by a running development server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : undefined,
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
