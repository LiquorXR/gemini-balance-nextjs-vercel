/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: "/api/v1/:path*" },
      { source: "/hf/v1/:path*", destination: "/api/v1/:path*" },
      {
        source: "/gemini/v1beta/:path*",
        destination: "/api/gemini/v1beta/:path*",
      },
      { source: "/v1beta/:path*", destination: "/api/gemini/v1beta/:path*" },
    ];
  },
};

module.exports = nextConfig;
