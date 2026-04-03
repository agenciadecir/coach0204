import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-0b6a4b2c-574a-4b0c-bdb0-25e5ffbd3355.space.z.ai',
    '.space.z.ai',
  ],
  // Force fresh build - v2
};

export default nextConfig;
