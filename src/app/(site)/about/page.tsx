import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { getMediaPlaceholders } from "@/lib/media-dimensions";
import { AboutPageScroll } from "@/components/site/about-page-scroll";
import { getSiteAbout } from "@/lib/get-site-about";
import { getSiteContact } from "@/lib/get-site-contact";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Giới thiệu",
  description:
    "Giới thiệu Tetris Design — công ty thiết kế và thi công nội thất thương mại tại Hà Nội, thành lập 2018.",
  path: "/about",
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function AboutPage() {
  const [content, contact] = await Promise.all([
    getSiteAbout(),
    getSiteContact(),
  ]);
  /* Ảnh mờ LQIP cho ảnh lớn (không gồm logo đối tác trong suốt). */
  const placeholders = await getMediaPlaceholders([
    content.heroImage,
    content.brandBreakImage,
  ]);
  return (
    <MediaPlaceholdersProvider value={placeholders}>
      <AboutPageScroll content={content} contact={contact} />
    </MediaPlaceholdersProvider>
  );
}
