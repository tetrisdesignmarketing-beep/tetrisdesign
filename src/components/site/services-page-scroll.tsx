"use client";

import {
  ServicesMarquee,
  ServicesShowcase,
} from "@/components/site/services-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import type { SiteService } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServicesPageScrollProps {
  services: readonly SiteService[];
  contact?: ContactPageContent;
}

export function ServicesPageScroll({
  services,
  contact,
}: ServicesPageScrollProps) {
  return (
    <>
      {/* 2 cột + chữ chạy chung 1 khung hình (desktop: cao đúng 1 màn dưới header). */}
      <div className="services-screen">
        <ServicesShowcase services={services} />
        <ServicesMarquee />
      </div>
      <SiteFooter contact={contact} />
    </>
  );
}
