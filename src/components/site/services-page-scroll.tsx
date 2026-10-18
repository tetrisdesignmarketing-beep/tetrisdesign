"use client";

import {
  ServicesMarquee,
  ServicesShowcase,
} from "@/components/site/services-showcase";
import type { SiteService } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServicesPageScrollProps {
  services: readonly SiteService[];
  /** Giữ cùng props với các layout khác (trang chọn layout truyền chung); layout này không có footer. */
  contact?: ContactPageContent;
}

export function ServicesPageScroll({ services }: ServicesPageScrollProps) {
  return (
    /* 2 cột + chữ chạy chung 1 khung hình (desktop: cao đúng 1 màn dưới header); không footer. */
    <div className="services-screen">
      <ServicesShowcase services={services} />
      <ServicesMarquee isStatic />
    </div>
  );
}
