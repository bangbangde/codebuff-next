import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/me",
        destination: "/#about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
