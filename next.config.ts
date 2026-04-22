import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengunci Vercel untuk Next.js versi terbaru (15+)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  
  // Mengunci Vercel untuk Next.js versi sebelumnya (14)
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

export default nextConfig;