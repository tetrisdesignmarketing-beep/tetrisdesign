"use client";

import { useCallback, useEffect, useState } from "react";
import { FPS_INNER_SCROLL_EDGE_PX } from "@/lib/full-page-scroll/constants";
import type { InnerScrollSnapshot } from "@/lib/full-page-scroll/types";

const DEFAULT_SNAPSHOT: InnerScrollSnapshot = {
  isAtTop: true,
  isAtBottom: false,
};

function measureInnerScroll(el: HTMLElement): InnerScrollSnapshot {
  const { scrollTop, scrollHeight, clientHeight } = el;
  const maxScrollTop = scrollHeight - clientHeight;

  if (maxScrollTop <= FPS_INNER_SCROLL_EDGE_PX) {
    return { isAtTop: true, isAtBottom: true };
  }

  return {
    isAtTop: scrollTop <= FPS_INNER_SCROLL_EDGE_PX,
    isAtBottom: scrollTop >= maxScrollTop - FPS_INNER_SCROLL_EDGE_PX,
  };
}

export function useSectionInnerScroll(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<InnerScrollSnapshot>(DEFAULT_SNAPSHOT);
  const [node, setNode] = useState<HTMLElement | null>(null);

  const scrollRef = useCallback(
    (element: HTMLElement | null) => {
      setNode(element);
    },
    [],
  );

  const sync = useCallback(() => {
    if (!node || !enabled) {
      setSnapshot(DEFAULT_SNAPSHOT);
      return;
    }

    setSnapshot(measureInnerScroll(node));
  }, [enabled, node]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đo scroll thực của DOM sau khi mount
    sync();
  }, [sync]);

  useEffect(() => {
    if (!node || !enabled) return;

    node.addEventListener("scroll", sync, { passive: true });

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(node);

    for (const child of node.children) {
      if (child instanceof HTMLElement) {
        resizeObserver.observe(child);
      }
    }

    return () => {
      node.removeEventListener("scroll", sync);
      resizeObserver.disconnect();
    };
  }, [enabled, node, sync]);

  return { scrollRef, snapshot, sync };
}

export function getInnerScrollElForSection(sectionId: string): HTMLElement | null {
  const section = document.getElementById(sectionId);
  const inner = section?.querySelector("[data-fps-inner-scroll]");
  return inner instanceof HTMLElement ? inner : null;
}

export function measureInnerScrollForSection(
  sectionId: string,
): InnerScrollSnapshot | null {
  const el = getInnerScrollElForSection(sectionId);
  if (!el) return null;
  return measureInnerScroll(el);
}

export { measureInnerScroll };
