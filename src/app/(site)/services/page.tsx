import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { getMediaPlaceholders } from "@/lib/media-dimensions";
import { ServiceDesign1Page } from "@/components/site/service-design1-page";
import { ServiceDesign2Page } from "@/components/site/service-design2-page";
import { ServicesPageScroll } from "@/components/site/services-page-scroll";
import { getSiteContact } from "@/lib/get-site-contact";
import { getSiteServicesPage } from "@/lib/get-site-services";
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

/** Layout admin chọn (Trang › Dịch vụ) → component hiển thị tương ứng. */
const SERVICES_LAYOUT_COMPONENTS = {
  service: ServicesPageScroll,
  service1: ServiceDesign1Page,
  service2: ServiceDesign2Page,
} as const;

export default async function ServicesPage() {
  const [{ services, layout }, contact] = await Promise.all([
    getSiteServicesPage(),
    getSiteContact(),
  ]);
  const LayoutPage = SERVICES_LAYOUT_COMPONENTS[layout];
  const placeholders = await getMediaPlaceholders(
    services.map((service) => service.image),
  );
  return (
    <MediaPlaceholdersProvider value={placeholders}>
      <LayoutPage services={services} contact={contact} />
    </MediaPlaceholdersProvider>
  );
}
