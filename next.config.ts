import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  output: "standalone",
  // Migrations are read from disk at boot (lib/migrations.ts); ship them with the server bundle.
  outputFileTracingIncludes: { "/**": ["./supabase/migrations/**"] },
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
