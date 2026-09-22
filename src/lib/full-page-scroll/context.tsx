"use client";

import { createContext, useContext } from "react";
import type { UseSectionPagerResult } from "@/hooks/use-section-pager";
import type {
  FpsTransitionEffect,
  PanelSlideLane,
} from "@/lib/full-page-scroll/types";

export interface FullPageScrollContextValue {
  pager: UseSectionPagerResult;
  viewportHeight: number;
  effect: FpsTransitionEffect;
  getPanelMotionState(index: number): "active" | "inactive" | "entering" | "exiting";
  getPanelSlideLane(index: number): PanelSlideLane;
}

const FullPageScrollContext = createContext<FullPageScrollContextValue | null>(
  null,
);

export function FullPageScrollProvider({
  value,
  children,
}: {
  value: FullPageScrollContextValue;
  children: React.ReactNode;
}) {
  return (
    <FullPageScrollContext.Provider value={value}>
      {children}
    </FullPageScrollContext.Provider>
  );
}

export function useFullPageScroll(): FullPageScrollContextValue {
  const context = useContext(FullPageScrollContext);
  if (!context) {
    throw new Error("useFullPageScroll must be used within FullPageScrollRoot");
  }
  return context;
}

/** Như `useFullPageScroll` nhưng không throw — null nếu không có
 * `FullPageScrollRoot` bao ngoài (trang cuộn bình thường, vd /services). */
export function useFullPageScrollOptional(): FullPageScrollContextValue | null {
  return useContext(FullPageScrollContext);
}

export function getPanelMotionState(
  index: number,
  currentIndex: number,
  transition: { from: number; to: number } | null,
): "active" | "inactive" | "entering" | "exiting" {
  if (!transition) {
    return index === currentIndex ? "active" : "inactive";
  }

  if (index === transition.to) return "entering";
  if (index === transition.from) return "exiting";
  return "inactive";
}

export function getPanelSlideLane(
  index: number,
  currentIndex: number,
  transition: { from: number; to: number } | null,
): PanelSlideLane {
  const visualIndex = transition?.to ?? currentIndex;
  if (index === visualIndex) return "current";
  if (index < visualIndex) return "before";
  return "after";
}
