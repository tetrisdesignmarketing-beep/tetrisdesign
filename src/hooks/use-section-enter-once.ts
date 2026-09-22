"use client";

import { useState } from "react";
import { useFullPageScrollOptional } from "@/lib/full-page-scroll/context";

/**
 * Latch: animation chỉ chạy lần đầu section xuất hiện.
 * Không có `FullPageScrollRoot` bao ngoài (trang cuộn bình thường, vd
 * /services) → coi như "in" ngay từ đầu, không chờ pager.
 */
export function useSectionEnterOnce(sectionId: string): "in" | "out" {
  const context = useFullPageScrollOptional();
  const [hasEntered, setHasEntered] = useState(() => context === null);

  if (context) {
    const { pager, getPanelMotionState } = context;
    const index = pager.sections.findIndex((section) => section.id === sectionId);
    const motion = index >= 0 ? getPanelMotionState(index) : "inactive";
    const visible = motion === "entering" || motion === "active";
    if (visible && !hasEntered) {
      setHasEntered(true);
    }
  }

  return hasEntered ? "in" : "out";
}
