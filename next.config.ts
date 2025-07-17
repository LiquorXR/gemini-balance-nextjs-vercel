import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./prisma/**/*"],
  },
  /* config options here */
};

export default nextConfig;
