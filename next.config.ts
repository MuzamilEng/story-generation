import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["lucide-react"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Run middleware in Node.js runtime instead of Edge to avoid
    // 'self is not defined' from the edge-wrapper template on Vercel.
    nodeMiddleware: true,
  },
};

export default nextConfig;
