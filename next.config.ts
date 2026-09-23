import { networkInterfaces } from "os";
import type { NextConfig } from "next";

function lanDevOrigins() {
  const origins = new Set<string>([
    "*.trycloudflare.com",
    "192.168.1.69",
    "192.168.1.6",
    "192.168.*",
    "10.*",
    "172.16.*",
    "172.17.*",
    "172.18.*",
    "172.19.*",
    "172.20.*",
    "172.21.*",
    "172.22.*",
    "172.23.*",
    "172.24.*",
    "172.25.*",
    "172.26.*",
    "172.27.*",
    "172.28.*",
    "172.29.*",
    "172.30.*",
    "172.31.*",
  ]);
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      /* Node đổi `family` giữa "IPv4" và 4 theo version */
      const family = String(net.family);
      const ipv4 = family === "IPv4" || family === "4";
      if (ipv4 && !net.internal) origins.add(net.address);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // Cloudflare tunnel + LAN (cùng WiFi) — thiết bị khác truy cập next dev
  allowedDevOrigins: lanDevOrigins(),
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
    // 45 = canvas preview; 75 = default next/image + canvas full
    // 30 = THỬ NGHIỆM tạm (About morph) — xoá khi test xong
    qualities: [30, 45, 75],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  serverExternalPackages: ["sharp"],
  // sharp 0.35+: NFT/Turbopack traces .node nhưng bỏ sót libvips-cpp.so →
  // ERR_DLOPEN_FAILED trên Vercel linux-x64 khi POST /api/media.
  outputFileTracingIncludes: {
    "/api/media": [
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
      "./node_modules/@img/sharp-linuxmusl-x64/**/*",
    ],
    "/api/media/complete": [
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
      "./node_modules/@img/sharp-linuxmusl-x64/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // 0 = prefetch `/` (force-dynamic) ngay khi logo/nav visible → Safari loop GET /
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // Safari hay báo navigation transferSize=0 → Next reload document mãi (GET /)
    reactDebugChannel: false,
  },
  async redirects() {
    return [
      {
        source: "/posts",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/posts/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
