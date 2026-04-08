import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["lucide-react"],
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;
