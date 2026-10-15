import { prisma } from "@/lib/prisma";
import { siteServices, type SiteService } from "@/lib/site-content";
import {
  DEFAULT_SERVICES_LAYOUT,
  servicesLayoutSchema,
  servicesPageSchema,
  type ServicesLayout,
} from "@/lib/validations/site-page";

export interface SiteServicesPage {
  services: SiteService[];
  layout: ServicesLayout;
}

/** Đọc riêng layout — vẫn giữ lựa chọn của admin kể cả khi danh sách dịch vụ lệch schema. */
function readLayout(content: unknown): ServicesLayout {
  const raw =
    content && typeof content === "object"
      ? (content as Record<string, unknown>).layout
      : undefined;
  const parsed = servicesLayoutSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SERVICES_LAYOUT;
}

/**
 * Trang dịch vụ public: `SitePage` slug `services` (danh sách dịch vụ + layout).
 * Chưa có row / JSON lệch / DB lỗi → `siteServices` + layout mặc định để landing không trống.
 */
export async function getSiteServicesPage(): Promise<SiteServicesPage> {
  try {
    const row = await prisma.sitePage.findUnique({
      where: { slug: "services" },
    });
    const layout = readLayout(row?.content);
    const parsed = servicesPageSchema.safeParse(row?.content);
    if (parsed.success && parsed.data.items.length > 0) {
      return { services: parsed.data.items, layout };
    }
    return { services: [...siteServices], layout };
  } catch {
    // giữ copy hardcode khi không kết nối được DB
  }

  return { services: [...siteServices], layout: DEFAULT_SERVICES_LAYOUT };
}
