import { HeroCarousel } from "@/components/site/hero-carousel";
import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { getMediaPlaceholders } from "@/lib/media-dimensions";
import { getHomeHeroSlides } from "@/lib/get-home-hero-slides";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Trang chủ",
  description:
    "TETRIS DESIGN — thiết kế kiến trúc, nội thất và thi công nhà hàng, showroom, khách sạn tại Việt Nam.",
  path: "/",
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const slides = await getHomeHeroSlides();
  /* Ảnh mờ LQIP của slider → slide hiện ngay bản mờ trong HTML. */
  const placeholders = await getMediaPlaceholders(
    slides.flatMap((slide) => [slide.mobileImage, slide.desktopImage]),
  );

  return (
    <>
      {/* Trang chủ chỉ còn slider full màn hình. */}
      <MediaPlaceholdersProvider value={placeholders}>
        <HeroCarousel slides={slides} />
      </MediaPlaceholdersProvider>
    </>
  );
}
