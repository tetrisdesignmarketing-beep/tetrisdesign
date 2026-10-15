"use client";

import { ServiceDesign1 } from "@/components/site/service-design1";
import { ServicesMarquee } from "@/components/site/services-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import type { SiteService } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServiceDesign1PageProps {
  services: readonly SiteService[];
  contact?: ContactPageContent;
}

/** Layout service1 của /services: cùng khung với /services (2 cột + "Work&" trong 1 khung hình). */
export function ServiceDesign1Page({ services, contact }: ServiceDesign1PageProps) {
  return (
    <>
      <div className="services-screen">
        <ServiceDesign1 services={services} />
        <ServicesMarquee />
      </div>
      <SiteFooter contact={contact} />
    </>
  );
}
