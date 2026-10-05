import type { MetadataRoute } from "next";
import { siteBrand } from "@/lib/site-content";

/** Web app manifest — icon logo Tetris (Android / "Thêm vào màn hình chính"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteBrand.name,
    short_name: siteBrand.name,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7a1f27",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
