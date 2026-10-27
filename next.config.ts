import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  output: "standalone",
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
