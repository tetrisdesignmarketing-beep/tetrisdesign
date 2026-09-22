"use client";

import { ServiceSection } from "@/components/site/service-section";
import { SiteFooter } from "@/components/site/site-footer";
import { SERVICES_SECTIONS } from "@/lib/services-section-config";
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
      {services.map((service, index) => (
        <ServiceSection
          key={service.title + index}
          title={service.title}
          description={service.description}
          image={service.image}
          imageAlt={service.imageAlt}
          reverse={index % 2 === 1}
          priority={index === 0}
          sectionId={SERVICES_SECTIONS[index]?.id ?? `service-${index}`}
        />
      ))}
      <SiteFooter contact={contact} />
    </>
  );
}
