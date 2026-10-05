"use client";

import { useCallback, useEffect, useState } from "react";
import { getHeaderOffset, getStableViewportHeight } from "@/lib/home-scroll";

export interface ViewportBelowHeader {
  height: number;
  headerOffset: number;
}

/** Đổi nhỏ hơn ngưỡng này thì bỏ qua — tránh re-render/đo lại liên tục */
const RESIZE_MIN_DELTA_PX = 24;

function isCoarsePointer(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}

export function useViewportBelowHeader(): ViewportBelowHeader {
  const [viewport, setViewport] = useState<ViewportBelowHeader>({
    height: 0,
    headerOffset: 91,
  });

  const sync = useCallback(() => {
    const headerOffset = getHeaderOffset();
    /* Touch: dùng viewport ổn định (không co theo visualViewport). Nếu lấy
       `visualViewport.height`, thanh URL iOS thu vào giữa lúc scroll sẽ đổi
       chiều cao panel → inner scroller bị đo lại và scroll bị nhảy. */
    const visualHeight = isCoarsePointer()
      ? getStableViewportHeight()
      : (window.visualViewport?.height ?? window.innerHeight);
    const height = Math.max(0, visualHeight - headerOffset);

    setViewport((previous) => {
      if (
        previous.headerOffset === headerOffset &&
        Math.abs(previous.height - height) < RESIZE_MIN_DELTA_PX
      ) {
        return previous;
      }
      return { height, headerOffset };
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đo viewport/header thực của DOM sau khi mount
    sync();

    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);

    const header = document.querySelector("header");
    let resizeObserver: ResizeObserver | undefined;

    if (header) {
      resizeObserver = new ResizeObserver(() => {
        sync();
      });
      resizeObserver.observe(header);
    }

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      resizeObserver?.disconnect();
    };
  }, [sync]);

  return viewport;
}
