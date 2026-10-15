"use client";

import { ProgressiveImage } from "@/components/site/progressive-image";
import { useServicesTabs } from "@/hooks/use-services-tabs";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { SiteService } from "@/lib/site-content";

interface ServicesShowcaseProps {
  services: readonly SiteService[];
}

/**
 * Trang Dịch vụ: cột trái là danh sách tiêu đề (mục đang chọn màu đỏ thương hiệu),
 * cột phải hiện ảnh + nhãn phụ + mô tả của mục tương ứng.
 * Desktop: rê chuột hoặc click; mobile: chạm hoặc vuốt ngang trên ảnh.
 */
export function ServicesShowcase({ services }: ServicesShowcaseProps) {
  const { getTabProps, getPanelProps, swipeProps } = useServicesTabs(
    services.length,
  );

  if (services.length === 0) return null;

  return (
    <section className="services-showcase">
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

      {/* Các panel chồng cùng 1 ô lưới → chiều cao ổn định, đổi mục chỉ fade, không nhảy layout. */}
      <div className="services-showcase__stage" {...swipeProps}>
        {services.map((service, index) => {
          const label = service.label?.trim();
          return (
            <div
              key={service.title + index}
              {...getPanelProps(index)}
              className="services-showcase__panel"
            >
              <div className="services-showcase__media">
                <ProgressiveImage
                  src={service.image}
                  alt={service.imageAlt}
                  previewWidth={CANVAS_PREVIEW_WIDTH}
                  fullWidth={CANVAS_FULL_WIDTH}
                  priority={index === 0}
                  loading="eager"
                  className="object-cover"
                  sizes="(min-width: 1024px) 22vw, 100vw"
                />
              </div>
              <div className="services-showcase__copy">
                {label ? (
                  <p className="services-showcase__label">{label}</p>
                ) : null}
                <p className="services-showcase__desc">{service.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* Theo mockup: "Work&" viết liền, nối tiếp thành "Work&Work&…". */
const MARQUEE_TEXT = "Work&";
const MARQUEE_REPEAT = 6;

/** Chữ khổng lồ chạy ngang liên tục "Work & Work & …" — trang trí, ẩn với trình đọc màn hình. */
export function ServicesMarquee() {
  const copy = Array.from({ length: MARQUEE_REPEAT }, () => MARQUEE_TEXT).join("");
  return (
    <div className="services-marquee" aria-hidden="true">
      <div className="services-marquee__track">
        <span className="services-marquee__copy">{copy}</span>
        <span className="services-marquee__copy">{copy}</span>
      </div>
    </div>
  );
}
