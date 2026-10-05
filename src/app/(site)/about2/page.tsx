import { AboutPageView } from "@/components/site/about-page-view";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Giới thiệu 2",
  description:
    "Giới thiệu Tetris Design — công ty thiết kế và thi công nội thất thương mại tại Hà Nội, thành lập 2018.",
  path: "/about2",
  /* Trang so sánh nội bộ — không lập chỉ mục, không có trong menu/sitemap. */
  noIndex: true,
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

/** Phương án B — logo kích hoạt theo vị trí, chạy theo thời gian (so sánh với /about). */
export default function About2Page() {
  return <AboutPageView variant="timed-logo" />;
}
