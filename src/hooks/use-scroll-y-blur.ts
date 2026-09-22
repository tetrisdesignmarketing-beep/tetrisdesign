"use client";

import { useLayoutEffect, useRef } from "react";
import { FPS_INNER_SCROLL_EDGE_PX } from "@/lib/full-page-scroll/constants";
import { useFullPageScrollOptional } from "@/lib/full-page-scroll/context";
import { getHeaderOffset } from "@/lib/home-scroll";

function readCssNumber(
  root: HTMLElement,
  name: string,
  fallback: number,
): number {
  const raw = getComputedStyle(root).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function shouldSkipBlur() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}

function clearBlur(nodes: NodeListOf<HTMLElement>) {
  nodes.forEach((node) => {
    node.style.setProperty("--about-scroll-blur-p", "1");
  });
}

/** 0 = max blur (dưới màn), 1 = nét (đã vào vùng `--about-scroll-blur-to`). */
export function useScrollYBlur(sectionId: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  const context = useFullPageScrollOptional();
  const index = context
    ? context.pager.sections.findIndex((section) => section.id === sectionId)
    : -1;
  const motion =
    context && index >= 0 ? context.getPanelMotionState(index) : "inactive";
  const enabled = context ? motion === "active" || motion === "entering" : true;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* Không còn bounded scroller riêng (About cuộn bình thường) — dùng wrapper
       [data-morph-pin] ngoài cùng (bọc cả ảnh pin lẫn intro/awards) để biết
       "đã cuộn hết nội dung hero" và viewport dưới header cho blur band. */
    const wrapper = root.closest("[data-morph-pin]");
    if (!(wrapper instanceof HTMLElement)) return;

    let frame = 0;
    let settleTimer = 0;

    const setSettled = (settled: boolean) => {
      if (settled) root.setAttribute("data-scroll-blur-settled", "");
      else root.removeAttribute("data-scroll-blur-settled");
    };

    const cancelSettle = () => {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
    };

    const isAtBottom = () => {
      const bottom = wrapper.getBoundingClientRect().bottom;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      return bottom <= viewportHeight + FPS_INNER_SCROLL_EDGE_PX;
    };

    const sync = () => {
      const nodes = root.querySelectorAll<HTMLElement>("[data-scroll-blur]");
      if (shouldSkipBlur()) {
        cancelSettle();
        setSettled(true);
        clearBlur(nodes);
        return;
      }

      const atBottom = isAtBottom();

      if (atBottom) {
        if (root.hasAttribute("data-scroll-blur-settled")) {
          clearBlur(nodes);
          return;
        }
        if (!settleTimer) {
          const delay = readCssNumber(root, "--about-scroll-blur-settle-ms", 200);
          settleTimer = window.setTimeout(() => {
            settleTimer = 0;
            if (!isAtBottom()) return;
            setSettled(true);
            clearBlur(root.querySelectorAll<HTMLElement>("[data-scroll-blur]"));
          }, delay);
        }
        /* Vẫn sync blur bình thường trong lúc chờ settle */
      } else {
        cancelSettle();
        setSettled(false);
      }

      const headerOffset = getHeaderOffset();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const clipTop = headerOffset;
      const clipHeight = Math.max(0, viewportHeight - headerOffset);
      if (clipHeight < 1) return;

      const fromRatio = readCssNumber(root, "--about-scroll-blur-from", 1);
      const toRatio = readCssNumber(root, "--about-scroll-blur-to", 0.4);
      const startY = clipTop + clipHeight * fromRatio;
      const endY = clipTop + clipHeight * toRatio;
      const span = startY - endY || 1;

      nodes.forEach((node) => {
        const top = node.getBoundingClientRect().top;
        node.style.setProperty(
          "--about-scroll-blur-p",
          String(clamp01((startY - top) / span)),
        );
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    sync();
    if (!enabled || shouldSkipBlur()) {
      return () => {
        cancelSettle();
        if (frame) cancelAnimationFrame(frame);
      };
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.visualViewport?.addEventListener("resize", onScroll);
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    observer.observe(wrapper);

    return () => {
      cancelSettle();
      setSettled(false);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return rootRef;
}
