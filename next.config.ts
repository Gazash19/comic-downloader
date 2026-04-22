import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memberitahu Vercel untuk tidak mengompres package robot
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;