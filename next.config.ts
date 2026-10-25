import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@zcatalyst/auth",
    "@zcatalyst/datastore",
    "@zcatalyst/stratus",
  ],
  // AppSail receives a self-contained runtime; Slate keeps its native build.
  output:
    process.env.CLAUSEWISE_APPSAIL_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
