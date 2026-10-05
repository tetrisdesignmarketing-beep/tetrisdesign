"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { HomeProjectCurtainList } from "@/components/site/home-project-curtain-list";
import { ProjectDetailRelated } from "@/components/site/project-detail-related";
import { ProjectFilter } from "@/components/site/project-filter";
import { Input } from "@/components/ui/input";
import { useProjectShowcase } from "@/hooks/use-project-showcase";
import type { SiteProject } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export interface ProjectShowcaseProps {
  projects: SiteProject[];
  className?: string;
  id?: string;
  layout?: "home" | "page";
  tabsDisplay?: boolean;
  showSearch?: boolean;
  /** `/projects` — hiện thêm khi cuộn tới cuối. */
  infinite?: boolean;
  scrollEffectMode?: boolean;
  emptyMessage?: string;
}

export function ProjectShowcase({
  projects,
  className,
  id,
  layout = "page",
  tabsDisplay = false,
  showSearch = false,
  infinite = false,
  scrollEffectMode = false,
  emptyMessage = "Chưa có dự án trong danh mục này.",
}: ProjectShowcaseProps) {
  const {
    visible,
    query,
    setQuery,
    total,
    hasMore,
    loadMore,
    visibleCount,
    mode,
  } = useProjectShowcase({
    projects,
    tabsDisplay,
    showSearch,
    infinite,
    scrollEffectMode,
  });

  const isHome = layout === "home";

  if (mode === "scroll") {
    return <ProjectDetailRelated projects={visible} className={className} />;
  }

  return (
    <section
      id={id}
      data-home-section={isHome ? "projects" : undefined}
      className={cn(
        isHome
          ? "flex min-h-[calc(100lvh-var(--site-header-total-height))] w-full flex-col justify-start"
          : "flex min-h-0 w-full flex-col justify-start",
        className,
      )}
    >
      {tabsDisplay ? (
        <Suspense
          fallback={
            <div className="h-[52px] shrink-0 md:h-[60px]" />
          }
        >
          <ProjectFilter stickTo="header" />
        </Suspense>
      ) : null}

      {showSearch ? (
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm dự án"
            aria-label="Tìm dự án"
          />
        </div>
      ) : null}

      {isHome ? (
        <h2
          data-home-projects-heading
          className="hidden shrink-0 md:block"
        >
          Dự án gần đây
        </h2>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full",
          isHome
            ? "flex max-w-lg flex-1 flex-col justify-start px-0 md:max-w-6xl"
            : "max-w-6xl px-4 py-6 md:py-8",
        )}
      >
        {visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <HomeProjectCurtainList
            projects={visible}
            sectionId={id}
            cardVariant={isHome ? "home" : "default"}
            gate={isHome ? "anchor" : "immediate"}
          />
        )}
      </div>

      {infinite && total > 0 ? (
        <ProjectInfiniteSentinel
          hasMore={hasMore}
          visibleCount={visibleCount}
          onLoadMore={loadMore}
        />
      ) : null}
    </section>
  );
}

function ProjectInfiniteSentinel({
  hasMore,
  visibleCount,
  onLoadMore,
}: {
  hasMore: boolean;
  visibleCount: number;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const requestedCount = useRef(-1);
  /* Giữ callback mới nhất cho effect/timer — gán sau commit, không gán trong render. */
  useLayoutEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    if (requestedCount.current > visibleCount) requestedCount.current = -1;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled || !entries.some((entry) => entry.isIntersecting)) return;
        if (requestedCount.current === visibleCount) return;
        requestedCount.current = visibleCount;
        cancelled = true;
        observer.disconnect();
        onLoadMoreRef.current();
      },
      /* Tải thêm khi còn cách cuối ~1 màn hình → không khựng khi gần đáy. */
      { root: null, rootMargin: "100% 0px" },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [hasMore, visibleCount]);

  if (!hasMore) return null;

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Đang tải thêm
    </div>
  );
}
