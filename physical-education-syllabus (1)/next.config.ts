import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` is a native-ish Node package; keep it out of the bundler so the
  // Postgres pool works on Vercel serverless functions.
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
};

export default nextConfig;
