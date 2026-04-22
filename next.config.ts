import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ini adalah perintah paksa (experimental) agar Vercel
  // SAMA SEKALI TIDAK menyentuh atau memeras robot kita
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

export default nextConfig;