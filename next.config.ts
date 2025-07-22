import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./prisma/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  /* config options here */
};

export default nextConfig;
