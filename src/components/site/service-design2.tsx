"use client";

import { ProgressiveImage } from "@/components/site/progressive-image";
import { useServicesTabs } from "@/hooks/use-services-tabs";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { SiteService } from "@/lib/site-content";

interface ServiceDesign2Props {
  services: readonly SiteService[];
}

/**
 * Layout Dịch vụ 2 (admin chọn "service2" cho /services): các cột ảnh co giãn.
 * Desktop: cột ngang — mục đang chọn nở rộng, hiện tiêu đề + nhãn phụ + mô tả;
 * mục khác co hẹp, phủ lớp tối, tên dịch vụ xoay dọc. Điện thoại: thành hàng xếp dọc.
 * Rê chuột / click / chạm / phím mũi tên để đổi mục (hook dùng chung với /services).
 */
export function ServiceDesign2({ services }: ServiceDesign2Props) {
  const { active, getTabProps, getPanelProps } = useServicesTabs(
    services.length,
    { orientation: "both" },
  );

  if (services.length === 0) return null;

  return (
    <section role="tablist" aria-label="Dịch vụ" className="service-design2">
      {services.map((service, index) => {
        const selected = index === active;
        const label = service.label?.trim();
        const number = String(index + 1).padStart(2, "0");
        return (
          <div
            key={service.title + index}
            data-active={selected ? "" : undefined}
            className="service-design2__col"
          >
            <ProgressiveImage
              src={service.image}
              alt={service.imageAlt}
              previewWidth={CANVAS_PREVIEW_WIDTH}
              fullWidth={CANVAS_FULL_WIDTH}
              priority={index === 0}
              loading="eager"
              className="object-cover"
              sizes="(min-width: 1024px) 66vw, 100vw"
            />
            <span className="service-design2__shade" aria-hidden="true" />
            <span className="service-design2__num" aria-hidden="true">
              {number}
            </span>
            {/* Tên dịch vụ trên cột đang co (xoay dọc ở desktop). */}
            <span className="service-design2__spine" aria-hidden="true">
              {service.title}
            </span>
            <div {...getPanelProps(index)} className="service-design2__panel">
              <h2 className="service-design2__title">{service.title}</h2>
              {label ? <p className="service-design2__label">{label}</p> : null}
              <p className="service-design2__desc">{service.description}</p>
            </div>
            {/* Nút phủ kín cột: cả cột là vùng rê chuột / bấm để chọn. */}
            <button {...getTabProps(index)} className="service-design2__hit">
              <span className="sr-only">{service.title}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
