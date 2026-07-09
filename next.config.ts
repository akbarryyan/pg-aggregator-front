import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.duitku.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
