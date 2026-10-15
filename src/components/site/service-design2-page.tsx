"use client";

import { ServiceDesign2 } from "@/components/site/service-design2";
import { ServicesMarquee } from "@/components/site/services-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import type { SiteService } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServiceDesign2PageProps {
  services: readonly SiteService[];
  contact?: ContactPageContent;
}

/**
 * Layout service2 của /services: cột ảnh co giãn + chữ "Work&" trong cùng 1 khung hình.
 * "Work&" đè lên mép dưới các cột, hoà trộn kiểu difference (đảo màu trên ảnh,
 * đen trên nền trắng) — thay vì nằm tách riêng ở đáy như /services.
 */
export function ServiceDesign2Page({ services, contact }: ServiceDesign2PageProps) {
  return (
    <>
      <div className="services-screen service-design2-screen">
        <ServiceDesign2 services={services} />
        <div className="service-design2__marquee">
          <ServicesMarquee />
        </div>
      </div>
      <SiteFooter contact={contact} />
    </>
  );
}
