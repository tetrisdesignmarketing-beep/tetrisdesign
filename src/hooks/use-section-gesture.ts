"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  getInnerScrollElForSection,
  measureInnerScroll,
} from "@/hooks/use-section-inner-scroll";
import type { UseSectionPagerResult } from "@/hooks/use-section-pager";
import {
  FPS_FIXED_GESTURE_MIN_PX,
  FPS_WHEEL_NOTCH_MIN,
  PARTNERS_SCROLL_SELECTOR,
} from "@/lib/full-page-scroll/constants";
import { SECTION_AXIS_LOCK_MIN } from "@/lib/home-scroll";
import type { InnerScrollSnapshot } from "@/lib/full-page-scroll/types";

type TouchOrigin = { x: number; y: number };
type SwipeAxis = "horizontal" | "vertical" | null;

interface UseSectionGestureOptions {
  pager: UseSectionPagerResult;
  enabled: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
}

const INNER_SCROLL_GESTURE_PX = 2;
/**
 * Khoảng lặng giữa 2 sự kiện wheel để coi là 1 cú cuộn MỚI. Trackpad/đà quán
 * tính bắn wheel liên tục (~16ms) → cả đà là 1 cú: cuộn hết nội dung trong
 * màn rồi thì phải dừng tay và cuộn tiếp mới sang màn sau (không trượt màn
 * vì đuôi quán tính).
 */
const WHEEL_GESTURE_GAP_MS = 180;

function isPartnersHorizontalTouch(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PARTNERS_SCROLL_SELECTOR));
}

function isSiteChromeTouch(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".site-header") ||
      target.closest("#site-mobile-menu") ||
      target.closest("[data-site-loading]"),
  );
}

/** Canvas giữ wheel/touch để zoom — không chuyển màn pager. */
function isInfiniteCanvasGesture(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-infinite-canvas]"));
}

function getInnerScrollEl(eventTarget: EventTarget | null): HTMLElement | null {
  if (!(eventTarget instanceof Element)) return null;
  const el = eventTarget.closest("[data-fps-inner-scroll]");
  return el instanceof HTMLElement ? el : null;
}

/** Inner của màn đang active — không lấy hero (querySelector đầu tiên). */
function resolveInnerScroll(
  eventTarget: EventTarget | null,
  pager: UseSectionPagerResult,
): HTMLElement | null {
  const section = pager.sections[pager.currentIndex];
  const currentInner = section
    ? getInnerScrollElForSection(section.id)
    : null;

  const fromTarget = getInnerScrollEl(eventTarget);
  if (fromTarget && currentInner && currentInner.contains(fromTarget)) {
    return fromTarget;
  }
  if (fromTarget && section) {
    const panel = document.getElementById(section.id);
    if (panel?.contains(fromTarget)) return fromTarget;
  }
  return currentInner ?? fromTarget;
}

/** Chặn rubber-band chỉ khi thật sự ở đáy nội dung có room cuộn. */
export function useSectionGesture({
  pager,
  enabled: _enabled,
  targetRef,
}: UseSectionGestureOptions) {
  const pagerRef = useRef(pager);
  const touchOriginRef = useRef<TouchOrigin | null>(null);
  const swipeAxisRef = useRef<SwipeAxis>(null);
  const innerScrollStartTopRef = useRef<number | null>(null);
  const innerEdgeStartRef = useRef<InnerScrollSnapshot | null>(null);
  const lastWheelAtRef = useRef(0);
  /* Cú cuộn hiện tại đã cuộn nội dung trong màn / đã đổi màn chưa. */
  const wheelGestureRef = useRef({ scrolledInner: false, paged: false });

  useLayoutEffect(() => {
    pagerRef.current = pager;
  }, [pager]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const resetTouch = () => {
      touchOriginRef.current = null;
      swipeAxisRef.current = null;
      innerScrollStartTopRef.current = null;
      innerEdgeStartRef.current = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isSiteChromeTouch(event.target) || isInfiniteCanvasGesture(event.target)) {
        resetTouch();
        return;
      }
      if (!target.contains(event.target as Node)) return;
      const touch = event.touches[0];
      if (!touch) return;

      touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
      swipeAxisRef.current = isPartnersHorizontalTouch(event.target)
        ? "horizontal"
        : null;

      const innerEl = resolveInnerScroll(event.target, pagerRef.current);
      innerScrollStartTopRef.current = innerEl?.scrollTop ?? null;
      innerEdgeStartRef.current = innerEl
        ? measureInnerScroll(innerEl)
        : pagerRef.current.syncInnerScrollFromDom(
            pagerRef.current.currentIndex,
          );
    };

    const onTouchMove = (event: TouchEvent) => {
      if (isInfiniteCanvasGesture(event.target)) return;
      const origin = touchOriginRef.current;
      const touch = event.touches[0];
      if (!origin || !touch) return;

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (
        !swipeAxisRef.current &&
        (absX >= SECTION_AXIS_LOCK_MIN || absY >= SECTION_AXIS_LOCK_MIN)
      ) {
        swipeAxisRef.current = absX >= absY ? "horizontal" : "vertical";
      }

      /*
       * Cuộn trong màn luôn để trình duyệt tự làm (native, có quán tính) —
       * không gán scrollTop, không preventDefault. Chỉ đổi màn ở touchend khi
       * nội dung đã chạm đáy/đỉnh (xem finishTouch).
       */
    };

    const finishTouch = (event: TouchEvent) => {
      if (isSiteChromeTouch(event.target) || isInfiniteCanvasGesture(event.target)) {
        resetTouch();
        return;
      }
      const origin = touchOriginRef.current;
      const touch = event.changedTouches[0];
      if (!origin || !touch) {
        resetTouch();
        return;
      }

      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const axis =
        swipeAxisRef.current ?? (absX >= absY ? "horizontal" : "vertical");

      const innerEl = resolveInnerScroll(event.target, pagerRef.current);
      const innerScrollStartTop = innerScrollStartTopRef.current;
      const startedAtBottom = innerEdgeStartRef.current?.isAtBottom ?? false;
      const startedAtTop = innerEdgeStartRef.current?.isAtTop ?? false;
      resetTouch();

      const p = pagerRef.current;
      if (p.isTransitioning) return;
      if (axis !== "vertical") return;
      if (absY < FPS_FIXED_GESTURE_MIN_PX) return;

      const inner = p.syncInnerScrollFromDom(p.currentIndex);
      const innerMoved =
        innerEl &&
        innerScrollStartTop !== null &&
        Math.abs(innerEl.scrollTop - innerScrollStartTop) >
          INNER_SCROLL_GESTURE_PX;

      /*
       * Finger lên (deltaY < 0) = xuống nội dung / màn sau.
       * Finger xuống (deltaY > 0) = lên nội dung / màn trước.
       */
      if (deltaY < 0) {
        if (innerMoved && !startedAtBottom && !inner.isAtBottom) {
          return;
        }
        if (!(startedAtBottom || inner.isAtBottom)) return;
        p.goNext();
        return;
      }

      if (innerMoved && !startedAtTop && !inner.isAtTop) {
        return;
      }
      if (startedAtTop || inner.isAtTop) {
        p.goPrev();
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (isInfiniteCanvasGesture(event.target)) return;
      const now = performance.now();
      if (now - lastWheelAtRef.current >= WHEEL_GESTURE_GAP_MS) {
        wheelGestureRef.current = { scrolledInner: false, paged: false };
      }
      lastWheelAtRef.current = now;
      const gesture = wheelGestureRef.current;

      const p = pagerRef.current;
      if (p.isTransitioning) return;

      const section = p.sections[p.currentIndex];
      const innerScrollEl = resolveInnerScroll(event.target, p);
      const inner = p.syncInnerScrollFromDom(p.currentIndex);

      if (section && section.mode === "scrollable" && innerScrollEl && inner) {
        const hasRoom =
          (event.deltaY > 0 && !inner.isAtBottom) ||
          (event.deltaY < 0 && !inner.isAtTop);
        if (hasRoom) {
          /* Con trỏ nằm trong khung cuộn → trình duyệt tự cuộn (native,
             listener passive). Chỉ tự cuộn hộ khi con trỏ ở ngoài khung. */
          const insideScroller =
            event.target instanceof Node && innerScrollEl.contains(event.target);
          if (!insideScroller) innerScrollEl.scrollTop += event.deltaY;
          gesture.scrolledInner = true;
          return;
        }
      }

      if (Math.abs(event.deltaY) < FPS_WHEEL_NOTCH_MIN) return;
      /* Mỗi cú cuộn chỉ đổi 1 màn; cú vừa cuộn hết nội dung thì không đổi. */
      if (gesture.paged || gesture.scrolledInner) return;
      gesture.paged = true;

      if (event.deltaY > 0) {
        p.goNext();
        return;
      }

      p.goPrev();
    };

    document.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    /* passive: không còn preventDefault → trình duyệt cuộn trên compositor. */
    document.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", finishTouch, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchcancel", finishTouch, {
      capture: true,
      passive: true,
    });
    target.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("touchend", finishTouch, true);
      document.removeEventListener("touchcancel", finishTouch, true);
      target.removeEventListener("wheel", onWheel);
    };
  }, [targetRef]);
}
