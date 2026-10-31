"use client";

import { useId } from "react";
import { WORK_AND_PATH, WORK_AND_TILE } from "@/lib/work-and-mark";

/** Số ô "Work&" trong 1 bản; track có 2 bản giống hệt → translateX(-50%) lặp liền mạch. */
const MARQUEE_REPEAT = 6;
const TILE_W = WORK_AND_TILE.width;
const TILE_H = WORK_AND_TILE.height;

/**
 * Chữ khổng lồ chạy ngang liên tục "Work&Work&…" — SVG vẽ lại từ design (thay chữ
 * font thường), path khai báo 1 lần rồi <use> lặp lại. Trang trí, ẩn với trình đọc màn hình.
 */
/** Vị trí khung hình trong design: mép trái màn hình cắt ngay giữa chữ W (đơn vị ô SVG). */
const STATIC_OFFSET_X = 395.8;

export function ServicesMarquee({
  isStatic = false,
}: {
  /** true: đứng yên đúng như design ("Vork&V" — nửa W đầu, nửa W cuối), không chạy. */
  isStatic?: boolean;
} = {}) {
  const pathId = `${useId()}-work-and`;
  if (isStatic) {
    return (
      <div className="services-marquee" aria-hidden="true">
        <svg
          className="services-marquee__copy services-marquee__copy--static"
          viewBox={`${STATIC_OFFSET_X} 0 ${TILE_W * 2 - STATIC_OFFSET_X} ${TILE_H}`}
          focusable="false"
        >
          <defs>
            <path id={pathId} d={WORK_AND_PATH} />
          </defs>
          <use href={`#${pathId}`} x={0} />
          <use href={`#${pathId}`} x={TILE_W} />
        </svg>
      </div>
    );
  }
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
