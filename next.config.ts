import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  webpack: (config) => {
    // Ignore markdown files in node_modules
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    // Handle node-specific modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Exclude libsql from server components bundling issues
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql', 'libsql'],
};

export default nextConfig;
