"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";

/** Vuốt ngang tối thiểu (px) và phải "ngang" rõ hơn dọc mới tính là đổi mục. */
const SWIPE_MIN_PX = 40;
const SWIPE_AXIS_RATIO = 1.2;

/** Chỉ đổi mục khi rê chuột trên thiết bị có hover thật (tránh tap giả hover trên mobile). */
function canHover(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/**
 * Logic chọn dịch vụ dùng chung cho 3 layout trang Dịch vụ (admin chọn layout cho /services):
 * rê chuột (desktop) / click / chạm, phím mũi tên (mặc định lên-xuống — ARIA tabs dọc),
 * vuốt ngang trên vùng ảnh (điện thoại). Trả về props gắn thẳng vào tab/panel.
 */
export function useServicesTabs(
  count: number,
  {
    orientation = "vertical",
  }: {
    /** Phím chuyển mục: dọc (↑↓), ngang (←→) hoặc cả hai (layout đổi hướng theo màn). */
    orientation?: "vertical" | "horizontal" | "both";
  } = {},
) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;
  /* Vòng tròn: cuối → đầu, đầu → cuối (khớp phím mũi tên). */
  const wrap = (index: number) => (index + count) % count;
  const step = (delta: number) => setActive((prev) => wrap(prev + delta));

  const getTabProps = (index: number) => {
    const selected = index === active;
    return {
      id: tabId(index),
      type: "button" as const,
      role: "tab" as const,
      "aria-selected": selected,
      "aria-controls": panelId(index),
      tabIndex: selected ? 0 : -1,
      "data-active": selected ? "" : undefined,
      onMouseEnter: () => {
        if (canHover()) setActive(index);
      },
      onFocus: () => setActive(index),
      onClick: () => setActive(index),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        const nextKeys =
          orientation === "vertical"
            ? ["ArrowDown"]
            : orientation === "horizontal"
              ? ["ArrowRight"]
              : ["ArrowDown", "ArrowRight"];
        const prevKeys =
          orientation === "vertical"
            ? ["ArrowUp"]
            : orientation === "horizontal"
              ? ["ArrowLeft"]
              : ["ArrowUp", "ArrowLeft"];
        const delta = nextKeys.includes(event.key)
          ? 1
          : prevKeys.includes(event.key)
            ? -1
            : 0;
        if (delta === 0) return;
        event.preventDefault();
        const next = wrap(index + delta);
        setActive(next);
        document.getElementById(tabId(next))?.focus();
      },
    };
  };

  const getPanelProps = (index: number) => {
    const selected = index === active;
    return {
      id: panelId(index),
      role: "tabpanel" as const,
      "aria-labelledby": tabId(index),
      "aria-hidden": !selected,
      inert: !selected,
      "data-active": selected ? "" : undefined,
    };
  };

  /*
   * Điện thoại: vuốt trái → mục sau, vuốt phải → mục trước. Không preventDefault
   * nên cuộn dọc vẫn mượt; vùng gắn props này cần CSS `touch-action: pan-y`.
   */
  const swipeProps = {
    onTouchStart: (event: TouchEvent<HTMLElement>) => {
      const touch = event.touches[0];
      touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event: TouchEvent<HTMLElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return;
      step(dx < 0 ? 1 : -1);
    },
    onTouchCancel: () => {
      touchStart.current = null;
    },
  };

  return { active, getTabProps, getPanelProps, swipeProps };
}
