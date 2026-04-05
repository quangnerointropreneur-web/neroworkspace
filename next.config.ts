import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/neroworkspace',
  trailingSlash: true,
  images: { unoptimized: true }
};

export default nextConfig;
