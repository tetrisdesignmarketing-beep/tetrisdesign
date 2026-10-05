"use client";

import { useCallback, useMemo, useState } from "react";
import type { SiteProject } from "@/lib/site-content";

/** Số dự án mỗi lần hiện thêm trên `/projects`. */
export const PROJECT_SHOWCASE_PAGE_SIZE = 10;

export interface UseProjectShowcaseOptions {
  projects: readonly SiteProject[];
  tabsDisplay?: boolean;
  showSearch?: boolean;
  /** Nối thêm từng đợt khi cuộn tới cuối. Home / related để false. */
  infinite?: boolean;
  scrollEffectMode?: boolean;
  pageSize?: number;
}

export function useProjectShowcase({
  projects,
  tabsDisplay = false,
  showSearch = false,
  infinite = false,
  scrollEffectMode = false,
  pageSize = PROJECT_SHOWCASE_PAGE_SIZE,
}: UseProjectShowcaseOptions) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const listKey = projects.map((project) => project.slug).join("\0");

  const filtered = useMemo(() => {
    if (!showSearch) return [...projects];
    const needle = query.trim().toLowerCase();
    if (!needle) return [...projects];
    return projects.filter((project) => {
      const hay = [project.title, project.location, project.categoryLabel]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [projects, query, showSearch]);

  const total = filtered.length;

  const visible = useMemo(() => {
    if (!infinite) return filtered;
    return filtered.slice(0, visibleCount);
  }, [filtered, infinite, visibleCount]);

  const hasMore = infinite && visible.length < total;

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + pageSize, total));
  }, [pageSize, total]);

  /* Đổi danh sách / từ khoá → hiện lại từ trang đầu (chỉnh state trong render). */
  const resetKey = `${listKey}\u0001${pageSize}\u0001${query}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(pageSize);
  }

  return {
    visible,
    query,
    setQuery,
    total,
    hasMore,
    loadMore,
    visibleCount,
    mode: scrollEffectMode ? ("scroll" as const) : ("grid" as const),
    tabsDisplay,
    showSearch,
    infinite,
  };
}
