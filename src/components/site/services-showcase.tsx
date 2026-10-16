"use client";

import { useId } from "react";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { useServicesTabs } from "@/hooks/use-services-tabs";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { SiteService } from "@/lib/site-content";
import { WORK_AND_PATH, WORK_AND_TILE } from "@/lib/work-and-mark";

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

/** Số ô "Work&" trong 1 bản; track có 2 bản giống hệt → translateX(-50%) lặp liền mạch. */
const MARQUEE_REPEAT = 6;
const TILE_W = WORK_AND_TILE.width;
const TILE_H = WORK_AND_TILE.height;

/**
 * Chữ khổng lồ chạy ngang liên tục "Work&Work&…" — SVG vẽ lại từ design (thay chữ
 * font thường), path khai báo 1 lần rồi <use> lặp lại. Trang trí, ẩn với trình đọc màn hình.
 */
export function ServicesMarquee() {
  const pathId = `${useId()}-work-and`;
  return (
    <div className="services-marquee" aria-hidden="true">
      <div className="services-marquee__track">
        {[0, 1].map((copy) => (
          <svg
            key={copy}
            className="services-marquee__copy"
            viewBox={`0 0 ${TILE_W * MARQUEE_REPEAT} ${TILE_H}`}
            focusable="false"
          >
            {copy === 0 ? (
              <defs>
                <path id={pathId} d={WORK_AND_PATH} />
              </defs>
            ) : null}
            {Array.from({ length: MARQUEE_REPEAT }, (_, index) => (
              <use key={index} href={`#${pathId}`} x={index * TILE_W} />
            ))}
          </svg>
        ))}
      </div>
    </div>
  );
}
