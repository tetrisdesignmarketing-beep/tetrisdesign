import type { Metadata } from "next";
import { siteBrand } from "@/lib/site-content";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tetrisdesign.vn";

type PageMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

/** Ảnh chia sẻ mặc định 1200×630 PNG (logo trên nền trắng). */
const DEFAULT_OG_IMAGE = "/site/og-default.png";

export function createPageMetadata({
  title,
  description = "TETRIS DESIGN — thiết kế kiến trúc, nội thất và thi công không gian thương mại tại Việt Nam.",
  path = "",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: PageMetadataOptions = {}): Metadata {
  const url = `${siteUrl}${path}`;
  /* Facebook / Zalo / LinkedIn không hiển thị ảnh SVG khi chia sẻ link →
     ảnh SVG (vd. ảnh dự án dự phòng) đổi sang ảnh mặc định PNG. */
  const ogImage = /\.svg(?:$|[?#])/i.test(image) ? DEFAULT_OG_IMAGE : image;
  const imageUrl = ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`;
  const isDefaultImage = ogImage === DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url,
      siteName: siteBrand.name,
      title: title ? `${title} | ${siteBrand.name}` : siteBrand.name,
      description,
      images: [
        isDefaultImage
          ? { url: imageUrl, width: 1200, height: 630, alt: siteBrand.name }
          : { url: imageUrl, alt: title ?? siteBrand.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${siteBrand.name}` : siteBrand.name,
      description,
      images: [imageUrl],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
