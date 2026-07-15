import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/@ffprobe-installer/darwin-*/ffprobe"
    ]
  },
  outputFileTracingExcludes: {
    "/*": [
      "./.codex/**/*",
      "./data/**/*",
      "./desktop/**/*",
      "./docs/**/*",
      "./script/**/*",
      "./tests/**/*",
      "./src/**/*",
      "./*.md",
      "./eslint.config.mjs",
      "./next.config.ts",
      "./tsconfig*.json",
      "./tsconfig*.tsbuildinfo"
    ]
  },
  turbopack: {
    root: process.cwd()
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
