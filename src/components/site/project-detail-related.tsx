"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getProjectCover, type SiteProject } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** Desktop related grid — max 5×4, no duplicate pad. */
export const RELATED_DESKTOP_MAX_COLS = 5;
export const RELATED_DESKTOP_MAX_ROWS = 4;
export const RELATED_DESKTOP_MAX_ITEMS =
  RELATED_DESKTOP_MAX_COLS * RELATED_DESKTOP_MAX_ROWS;

const RELATED_COLUMNS_MOBILE = 3;
const RELATED_MOBILE_MAX_ITEMS = 9;
const RELATED_TITLE = "Các dự án khác";
const RELATED_DESKTOP_MQ = "(min-width: 1024px)";

interface ProjectDetailRelatedProps {
  projects: SiteProject[];
  className?: string;
}

/** Pick cols/rows ≤5×4 with fewest empty cells, then fewer rows, then more cols. */
export function layoutRelatedDesktop(count: number): {
  cols: number;
  rows: number;
} {
  const n = Math.min(Math.max(count, 0), RELATED_DESKTOP_MAX_ITEMS);
  if (n === 0) return { cols: 0, rows: 0 };

  let best = { cols: 1, rows: n };
  let bestScore = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= Math.min(RELATED_DESKTOP_MAX_COLS, n); cols++) {
    const rows = Math.ceil(n / cols);
    if (rows > RELATED_DESKTOP_MAX_ROWS) continue;
    const empty = cols * rows - n;
    const score = empty * 1000 + rows * 10 - cols;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows };
    }
  }

  return best;
}

function layoutRelatedMobile(count: number): { cols: number; rows: number } {
  const n = Math.min(Math.max(count, 0), RELATED_MOBILE_MAX_ITEMS);
  if (n === 0) return { cols: 0, rows: 0 };
  const cols = Math.min(RELATED_COLUMNS_MOBILE, n);
  return { cols, rows: Math.ceil(n / cols) };
}

function countGridColumns(grid: HTMLElement, fallback: number) {
  const raw = getComputedStyle(grid).getPropertyValue("grid-template-columns");
  const count = raw.split(/\s+/).filter(Boolean).length;
  return count > 0 ? count : fallback;
}

export function ProjectDetailRelated({
  projects,
  className,
}: ProjectDetailRelatedProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  const items = useMemo(
    () => projects.slice(0, RELATED_DESKTOP_MAX_ITEMS),
    [projects],
  );
  const desktopLayout = useMemo(
    () => layoutRelatedDesktop(items.length),
    [items.length],
  );
  const mobileLayout = useMemo(
    () => layoutRelatedMobile(Math.min(items.length, RELATED_MOBILE_MAX_ITEMS)),
    [items.length],
  );
  const titleChars = [...RELATED_TITLE];

  useEffect(() => {
    const mq = window.matchMedia(RELATED_DESKTOP_MQ);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || items.length === 0) return;

    gsap.registerPlugin(ScrollTrigger);

    const scroller = root.closest<HTMLElement>("[data-fps-inner-scroll]");
    const scrollTrigger = scroller ? { scroller } : {};
    const colsFallback = isDesktop
      ? desktopLayout.cols || RELATED_DESKTOP_MAX_COLS
      : mobileLayout.cols || RELATED_COLUMNS_MOBILE;

    const ctx = gsap.context(() => {
      const textElement = root.querySelector<HTMLElement>(".text");
      const chars = textElement?.querySelectorAll<HTMLElement>(".char");
      const gridFull = root.querySelector<HTMLElement>(".grid--full");

      if (textElement && chars && chars.length > 0) {
        gsap
          .timeline({
            scrollTrigger: {
              ...scrollTrigger,
              trigger: textElement,
              start: "top 90%",
              end: "top 45%",
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            chars,
            { yPercent: 300, autoAlpha: 0 },
            {
              yPercent: 0,
              autoAlpha: 1,
              ease: "sine",
              stagger: {
                each: 0.04,
                from: "center",
              },
            },
          );
      }

      if (!gridFull) return;

      const gridFullItems = [
        ...gridFull.querySelectorAll<HTMLElement>(".grid__item"),
      ].filter((item) => getComputedStyle(item).display !== "none");
      const numColumns = countGridColumns(gridFull, colsFallback);
      const middleColumnIndex = Math.floor(numColumns / 2);
      const columns: HTMLElement[][] = Array.from(
        { length: numColumns },
        () => [],
      );

      gridFullItems.forEach((item, index) => {
        columns[index % numColumns]?.push(item);
      });

      columns.forEach((columnItems, columnIndex) => {
        if (columnItems.length === 0) return;
        const delayFactor = Math.abs(columnIndex - middleColumnIndex) * 0.2;
        const images = columnItems
          .map((item) => item.querySelector<HTMLElement>(".grid__item-img"))
          .filter((img): img is HTMLElement => Boolean(img));

        gsap
          .timeline({
            scrollTrigger: {
              ...scrollTrigger,
              trigger: gridFull,
              start: "top bottom",
              end: "center center",
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .from(columnItems, {
            yPercent: 450,
            autoAlpha: 0,
            delay: delayFactor,
            ease: "sine",
          })
          .from(
            images,
            {
              transformOrigin: "50% 0%",
              ease: "sine",
            },
            0,
          );
      });
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const raf = window.requestAnimationFrame(refresh);
    window.addEventListener("resize", refresh);

    /* Lần đầu vào trang: ảnh gallery phía trên (height:auto) còn đang tải nên
       trang ngắn hơn thực tế → ScrollTrigger tính điểm start/end quá sớm; tới
       lúc cuộn xuống, ảnh đã tải xong đẩy khối này xuống dưới → đã vượt quá
       "end", animation coi như chạy xong (không thấy chữ/ảnh bay vào). Refresh
       có thể lấy lại cache ảnh nên lần 2 mới đúng. Theo dõi chiều cao trang và
       tính lại vị trí trigger mỗi khi layout phía trên đổi (debounce). */
    let layoutTimer = 0;
    let lastHeight = document.documentElement.scrollHeight;
    const scheduleRefresh = () => {
      window.clearTimeout(layoutTimer);
      layoutTimer = window.setTimeout(() => {
        const height = document.documentElement.scrollHeight;
        if (height === lastHeight) return;
        lastHeight = height;
        refresh();
      }, 150);
    };
    const layoutObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleRefresh)
        : null;
    layoutObserver?.observe(document.body);
    const onWindowLoad = () => {
      lastHeight = -1;
      scheduleRefresh();
    };
    window.addEventListener("load", onWindowLoad);
    document.fonts?.ready.then(onWindowLoad).catch(() => {});

    const panel = root.closest<HTMLElement>("[data-fps-panel]");
    const motionObserver = panel
      ? new MutationObserver(() => {
          const motion = panel.getAttribute("data-fps-motion");
          if (motion === "active" || motion === "entering") refresh();
        })
      : null;
    motionObserver?.observe(panel!, {
      attributes: true,
      attributeFilter: ["data-fps-motion"],
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("load", onWindowLoad);
      window.clearTimeout(layoutTimer);
      layoutObserver?.disconnect();
      motionObserver?.disconnect();
      ctx.revert();
    };
  }, [
    desktopLayout.cols,
    isDesktop,
    items.length,
    mobileLayout.cols,
    reduced,
  ]);

  if (items.length === 0) return null;

  const desktopCols = Math.max(desktopLayout.cols, 1);
  const desktopRows = Math.max(desktopLayout.rows, 1);
  const mobileCols = Math.max(mobileLayout.cols, 1);
  const mobileRows = Math.max(mobileLayout.rows, 1);

  return (
    <section
      ref={rootRef}
      className={cn("project-detail-related", className)}
      aria-label="Dự án khác"
      style={
        {
          "--related-cols-mobile": mobileCols,
          "--related-rows-mobile": mobileRows,
          "--related-cols-desktop": desktopCols,
          "--related-rows-desktop": desktopRows,
          "--related-aspect-desktop": `${desktopCols} / ${desktopRows}`,
        } as CSSProperties
      }
    >
      <div className="project-detail-related__intro">
        <h2 className="text" aria-label={RELATED_TITLE}>
          {titleChars.map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="char"
              aria-hidden="true"
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h2>
      </div>

      <div className="grid grid--full">
        {items.map((project) => (
          <figure key={project.slug} className="grid__item">
            <Link href={`/projects/${project.slug}`} title={project.title}>
              <div
                className="grid__item-img"
                style={{
                  backgroundImage: `url("${getProjectCover(project)}")`,
                }}
              />
              <span className="grid__item-title">{project.title}</span>
            </Link>
          </figure>
        ))}
      </div>

      <div className="project-detail-related__spacer" aria-hidden />
    </section>
  );
}
