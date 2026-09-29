import { HeroCarousel } from "@/components/site/hero-carousel";
import { getHomeHeroSlides } from "@/lib/get-home-hero-slides";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Trang chủ",
  description:
    "TETRIS DESIGN — thiết kế kiến trúc, nội thất và thi công nhà hàng, showroom, khách sạn tại Việt Nam.",
  path: "/",
});

/** CMS slider đổi là thấy ngay — không cache trang chủ. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const slides = await getHomeHeroSlides();

  return (
    <>
      {/* Trang chủ chỉ còn slider full màn hình. */}
      <HeroCarousel slides={slides} />
    </>
  );
}
