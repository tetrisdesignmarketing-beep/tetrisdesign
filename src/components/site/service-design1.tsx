"use client";

import { ProgressiveImage } from "@/components/site/progressive-image";
import { useServicesTabs } from "@/hooks/use-services-tabs";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { SiteService } from "@/lib/site-content";

interface ServiceDesign1Props {
  services: readonly SiteService[];
}

/** Số lớp ảnh nhìn thấy trong xấp (trên cùng + 2 lớp ló ra); lớp sâu hơn ẩn sau. */
const STACK_VISIBLE = 3;

/**
 * Layout Dịch vụ 1 (admin chọn "service1" cho /services): giống /services (cột tiêu đề y hệt), chỉ khác
 * khối ảnh: xấp ảnh của mọi dịch vụ, mục đang chọn được xếp lên trên cùng.
 */
export function ServiceDesign1({ services }: ServiceDesign1Props) {
  const { active, getTabProps, getPanelProps, swipeProps } = useServicesTabs(
    services.length,
  );
  if (services.length === 0) return null;

  const count = services.length;

  return (
    <section className="services-showcase service-design1">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Dịch vụ"
        className="services-showcase__list"
      >
        {services.map((service, index) => (
          <button
            key={service.title + index}
            {...getTabProps(index)}
            className="services-showcase__title"
          >
            {service.title}
          </button>
        ))}
      </div>

      <div className="service-design1__right">
        <div className="service-design1__stack" {...swipeProps}>
          {services.map((service, index) => {
            // 0 = trên cùng (đang chọn), 1 = mục kế tiếp, 2 = mục trước…
            const rank = (index - active + count) % count;
            return (
              <div
                key={service.title + index}
                data-rank={Math.min(rank, STACK_VISIBLE)}
                aria-hidden={rank !== 0}
                className="service-design1__card"
              >
                <ProgressiveImage
                  src={service.image}
                  alt={rank === 0 ? service.imageAlt : ""}
                  previewWidth={CANVAS_PREVIEW_WIDTH}
                  fullWidth={CANVAS_FULL_WIDTH}
                  priority={index === 0}
                  loading="eager"
                  className="object-cover"
                  sizes="(min-width: 1024px) 22vw, 100vw"
                />
              </div>
            );
          })}
        </div>

        {/* Nhãn phụ + mô tả: chồng cùng 1 ô lưới, đổi mục chỉ fade (như /services). */}
        <div className="service-design1__copies">
          {services.map((service, index) => {
            const label = service.label?.trim();
            return (
              <div
                key={service.title + index}
                {...getPanelProps(index)}
                className="services-showcase__copy service-design1__copy"
              >
                {label ? (
                  <p className="services-showcase__label">{label}</p>
                ) : null}
                <p className="services-showcase__desc">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
