"use client";

import { ServiceDesign1 } from "@/components/site/service-design1";
import { ServicesMarquee } from "@/components/site/services-showcase";
import type { SiteService } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServiceDesign1PageProps {
  services: readonly SiteService[];
  /** Giữ cùng props với các layout khác (trang chọn layout truyền chung); layout này không có footer. */
  contact?: ContactPageContent;
}

/** Layout service1 của /services: cùng khung với layout mặc định (2 cột + "Work&" trong 1 khung hình), không footer. */
export function ServiceDesign1Page({ services }: ServiceDesign1PageProps) {
  return (
    <div className="services-screen">
      <ServiceDesign1 services={services} />
      <ServicesMarquee />
    </div>
  );
}
