import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { getMediaPlaceholders } from "@/lib/media-dimensions";
import { ServicesPageScroll } from "@/components/site/services-page-scroll";
import { getSiteContact } from "@/lib/get-site-contact";
import { getSiteServices } from "@/lib/get-site-services";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Dịch vụ",
  description:
    "Dịch vụ Tetris Design: thiết kế nhận diện thương hiệu, kiến trúc & nội thất, thi công trọn gói.",
  path: "/services",
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function ServicesPage() {
  const [services, contact] = await Promise.all([
    getSiteServices(),
    getSiteContact(),
  ]);
  const placeholders = await getMediaPlaceholders(
    services.map((service) => service.image),
  );
  return (
    <MediaPlaceholdersProvider value={placeholders}>
      <ServicesPageScroll services={services} contact={contact} />
    </MediaPlaceholdersProvider>
  );
}
