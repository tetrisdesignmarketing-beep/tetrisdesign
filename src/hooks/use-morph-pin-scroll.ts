"use client";

import { useLayoutEffect, useRef } from "react";
import { useFullPageScrollOptional } from "@/lib/full-page-scroll/context";
import { getHeaderOffset, getStableViewportHeight } from "@/lib/home-scroll";

function isCoarsePointer(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}

function readCssNumber(
  root: HTMLElement,
  name: string,
  fallback: number,
): number {
  const raw = getComputedStyle(root).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readPositiveRatio(
  root: HTMLElement,
  name: string,
  fallback: number,
): number {
  const value = readCssNumber(root, name, fallback);
  return value > 0 ? value : fallback;
}

function setCssVar(el: HTMLElement, name: string, value: string) {
  if (el.style.getPropertyValue(name) === value) return;
  el.style.setProperty(name, value);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Brand-break: letter-ratio theo chiều cao scroller (target px → ratio clamp).
 * Hero (letter-ratio CSS = 0) không gọi.
 */
function resolveBrandBreakLetterRatio(root: HTMLElement, vvh: number): number {
  const fallback = readCssNumber(root, "--morph-pin-letter-ratio", 0.24);
  if (vvh < 1) return fallback;
  const targetPx = readCssNumber(root, "--brand-break-letter-px", 200);
  const minR = readCssNumber(root, "--brand-break-letter-ratio-min", 0.16);
  const maxR = readCssNumber(root, "--brand-break-letter-ratio-max", 0.28);
  return clamp(targetPx / vvh, minR, maxR);
}

/**
 * Exit soft-stagger top→mid→bot trên [0, finishAt] của letter phase.
 */
function staggerLetterExitProgress(
  pLetter: number,
  blockIndex: number,
  stagger = 0.1,
  finishAt = 1,
): number {
  const s = Math.min(0.3, Math.max(0, stagger));
  const end = Math.min(1, Math.max(s * 2 + 0.05, finishAt));
  const span = Math.max(0.01, end - 2 * s);
  return clamp01((pLetter - blockIndex * s) / span);
}

function letterExitPx(progress: number, vw: number): string {
  return `${(Math.round(-progress * vw * 10) / 10).toFixed(1)}px`;
}

/** Enter: phải (vw) → đích (0) — ngược hướng exit, dùng chung hàm so le. */
function enterOffsetPx(progress: number, vw: number): string {
  return `${(Math.round((1 - progress) * vw * 10) / 10).toFixed(1)}px`;
}

/** Đáy photo đã paint (object-contain), không phải đáy khung wrapper. */
function measureVisualImageBottom(wrapper: HTMLElement): number {
  const img = wrapper.querySelector("img");
  const fallback = wrapper.getBoundingClientRect().bottom;
  if (!(img instanceof HTMLImageElement)) return fallback;
  if (img.naturalWidth < 1 || img.naturalHeight < 1) return fallback;

  const rect = img.getBoundingClientRect();
  const style = getComputedStyle(img);
  const scaleX = img.offsetWidth > 0 ? rect.width / img.offsetWidth : 1;
  const scaleY = img.offsetHeight > 0 ? rect.height / img.offsetHeight : 1;
  const padT = (Number.parseFloat(style.paddingTop) || 0) * scaleY;
  const padB = (Number.parseFloat(style.paddingBottom) || 0) * scaleY;
  const padL = (Number.parseFloat(style.paddingLeft) || 0) * scaleX;
  const padR = (Number.parseFloat(style.paddingRight) || 0) * scaleX;

  const contentTop = rect.top + padT;
  const contentW = Math.max(0, rect.width - padL - padR);
  const contentH = Math.max(0, rect.height - padT - padB);
  if (contentW < 1 || contentH < 1) return fallback;

  const fit = Math.min(
    contentW / img.naturalWidth,
    contentH / img.naturalHeight,
  );
  const renderedH = img.naturalHeight * fit;
  const extraH = contentH - renderedH;

  let posY = 0.5;
  const pos = style.objectPosition.trim().split(/\s+/);
  const yToken = pos[1] ?? pos[0];
  if (yToken === "top") posY = 0;
  else if (yToken === "bottom") posY = 1;
  else if (yToken === "center") posY = 0.5;
  else if (yToken?.endsWith("%")) posY = Number.parseFloat(yToken) / 100;
  if (!Number.isFinite(posY)) posY = 0.5;

  return contentTop + extraH * posY + renderedH;
}

function measureContentShiftPx(
  root: HTMLElement,
  titleGapPx: number,
  appliedShiftPx: number,
): number | null {
  const image = root.querySelector("[data-morph-pin-image]");
  const title = root.querySelector(
    "[data-morph-pin-content] [data-section-title]",
  );
  if (!(image instanceof HTMLElement) || !(title instanceof HTMLElement)) {
    return null;
  }

  const naturalTop = title.getBoundingClientRect().top - appliedShiftPx;
  return measureVisualImageBottom(image) + titleGapPx - naturalTop;
}

/** localScrollTop dùng chung cho các hook khác (vd. brand-break logo snap-home):
 * vị trí cuộn cục bộ so với track — 0 nghĩa là chưa chạm điểm sticky, tăng dần
 * khi đang pin. `null` khi root chưa mount hoặc không tìm thấy track. */
export function getMorphPinLocalScrollTop(root: HTMLElement): number | null {
  const track = root.querySelector("[data-morph-pin-track]");
  if (!(track instanceof HTMLElement)) return null;
  const headerOffset = getHeaderOffset();
  const trackTop = track.getBoundingClientRect().top;
  return Math.max(0, headerOffset - trackTop);
}

/** Chữ (tùy chọn) → ảnh scale → pin dưới menu → flow khi title cách photo `--morph-pin-title-gap` (sticky tự nhả). */
export function useMorphPinScroll(sectionId: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frozenTopRef = useRef<number | null>(null);
  const frozenShrinkRef = useRef<number | null>(null);
  const frozenShiftRef = useRef<number | null>(null);
  /**
   * Target shift (ảnh đáy + title-gap − title natural).
   * Cập nhật khi ảnh còn scale; đóng băng sau shrinkDone (pin) rồi khi flow.
   * Không khóa one-shot lúc mới vào image — đáy ảnh còn thấp → chữ bị đè.
   */
  const targetShiftRef = useRef<number | null>(null);
  const lastMeasureProgressRef = useRef({ pShrink: -1, pAlign: -1 });
  const lastVvhRef = useRef(0);
  const shiftRef = useRef(0);
  const context = useFullPageScrollOptional();
  const index = context
    ? context.pager.sections.findIndex((section) => section.id === sectionId)
    : -1;
  const motion =
    context && index >= 0 ? context.getPanelMotionState(index) : "inactive";
  /* Không có FullPageScrollRoot (trang cuộn bình thường, vd /about) → luôn bật,
     không còn khái niệm panel "inactive". */
  const enabled = context ? motion === "active" || motion === "entering" : true;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const track = root.querySelector("[data-morph-pin-track]");
    if (!(track instanceof HTMLElement)) return;
    root.dataset.morphPinBound = "react";

    let frame = 0;
    let touchEndFrame = 0;
    /* Đang chạm: không remeasure vvh — iOS sẽ hủy momentum và ảnh giật thay vì scale. */
    let touching = false;

    const sync = () => {
      const vvhSlack = Math.max(
        1,
        readCssNumber(root, "--morph-pin-vvh-slack", 48),
      );
      const headerOffset = getHeaderOffset();
      /* Touch: dùng viewport ổn định (không co theo visualViewport) — khớp
         `useViewportBelowHeader`, tránh thanh URL iOS đổi giữa lúc cuộn làm
         vvh đo lại liên tục và ảnh giật. */
      const rawViewportHeight = isCoarsePointer()
        ? getStableViewportHeight()
        : (window.visualViewport?.height ?? window.innerHeight);
      let vvh = Math.max(0, rawViewportHeight - headerOffset);
      if (vvh <= 0) return;

      const prevVvh = lastVvhRef.current;
      if (prevVvh > 0 && (touching || Math.abs(vvh - prevVvh) < vvhSlack)) {
        vvh = prevVvh;
      }

      const isBrandBreak = root.hasAttribute("data-brand-break");
      const cssLetterRatio = Math.max(
        0,
        readCssNumber(root, "--morph-pin-letter-ratio", 0),
      );
      const letterRatio =
        cssLetterRatio > 0 && isBrandBreak
          ? resolveBrandBreakLetterRatio(root, vvh)
          : cssLetterRatio;
      const imageRatio = readPositiveRatio(
        root,
        "--morph-pin-image-ratio",
        1,
      );
      const shrinkSpeed = readPositiveRatio(
        root,
        "--morph-pin-shrink-speed",
        1.2,
      );
      const topSpeed = readPositiveRatio(root, "--morph-pin-top-speed", 0.8);
      const alignSpeed = readPositiveRatio(
        root,
        "--morph-pin-align-speed",
        1.2,
      );
      const titleGapPx = readCssNumber(root, "--morph-pin-title-gap", 0);
      /* Enter (logo phải → đích): chỉ brand-break có; hero luôn 0 (không có
         LogoComponent). Cộng vào alignUnstick để track có đủ chỗ cuộn. */
      const enterRatio = isBrandBreak
        ? readPositiveRatio(root, "--brand-break-enter-ratio", 0.14)
        : 0;
      const enterDist = vvh * enterRatio;
      const letterDist = vvh * letterRatio;
      const imageDist = vvh * imageRatio;
      const alignUnstick =
        enterDist +
        letterDist +
        (alignSpeed > 0 ? imageDist / alignSpeed : imageDist);

      const prevMeasuredVvh = lastVvhRef.current;
      if (prevMeasuredVvh > 0 && Math.abs(vvh - prevMeasuredVvh) >= vvhSlack) {
        setCssVar(root, "--morph-pin-vvh", `${vvh}px`);
        setCssVar(root, "--morph-pin-collapse", `${alignUnstick}px`);
        /* Không còn remap scrollTop khi vvh đổi (không có scroller riêng để ghi
           nữa) — localScrollTop đọc trực tiếp vị trí track mỗi frame nên tự
           sửa đúng ở lần cuộn kế tiếp, không cần ghi đè window.scrollTo(). */
        frozenShiftRef.current = null;
        targetShiftRef.current = null;
        lastMeasureProgressRef.current = { pShrink: -1, pAlign: -1 };
      }
      lastVvhRef.current = vvh;
      if (letterRatio > 0) {
        setCssVar(root, "--morph-pin-letter-ratio-used", String(letterRatio));
      }

      /* Local scroll progress: 0 trước khi track chạm điểm sticky (track top ==
         headerOffset), tăng 1:1 khi đang pin. Không cần chặn trần — mọi công
         thức phía dưới đều tự clamp01. */
      const trackTop = track.getBoundingClientRect().top;
      const scrollTop = Math.max(0, headerOffset - trackTop);
      /* Enter chạy TRƯỚC letter/exit trên cùng trục scrollTop — 2 pha tách
         biệt tự nhiên theo vị trí cuộn, không chồng lấn nên không cần "armed"
         nữa (trước đây cần khoá vì enter chạy timer riêng, có thể chưa xong
         mà letter đã bắt đầu). */
      const pEnter = enterDist > 0 ? clamp01(scrollTop / enterDist) : 1;
      const morphScrollTop = Math.max(0, scrollTop - enterDist);

      const pLetter = letterDist > 0 ? clamp01(morphScrollTop / letterDist) : 1;
      const lettersOut = pLetter >= 1;
      const pImage =
        lettersOut && imageDist > 0
          ? clamp01((morphScrollTop - letterDist) / imageDist)
          : 0;
      let pShrink = lettersOut ? clamp01(pImage * shrinkSpeed) : 0;
      let pTop = lettersOut ? clamp01(pImage * topSpeed) : 0;
      const pAlign = lettersOut ? clamp01(pImage * alignSpeed) : 0;

      /* Scale đóng băng khi shrink xong; flow khi title cách ảnh title-gap.
       Unstick = sticky tự nhả khi scrollTop > collapse (không đổi relative — tránh nhảy). */
      const shrinkDone = lettersOut && pShrink >= 1;
      const titleArrived = lettersOut && pAlign >= 1;
      const freezeScale = shrinkDone || titleArrived;

      if (!freezeScale) {
        frozenTopRef.current = null;
        frozenShrinkRef.current = null;
      } else {
        if (frozenTopRef.current === null) {
          frozenTopRef.current = pTop;
        }
        if (frozenShrinkRef.current === null) {
          frozenShrinkRef.current = pShrink;
        }
        pTop = frozenTopRef.current;
        pShrink = frozenShrinkRef.current;
      }

      if (!titleArrived) {
        frozenShiftRef.current = null;
      }

      if (!lettersOut) {
        targetShiftRef.current = null;
        lastMeasureProgressRef.current = { pShrink: -1, pAlign: -1 };
      }

      let phase = "letter";
      if (titleArrived) phase = "flow";
      else if (shrinkDone) phase = "pin";
      else if (lettersOut) phase = "image";

      root.dataset.morphPinPhase = phase;

      /* Dọn margin-top từ bản flow/relative cũ (tránh ảnh kẹt đáy sau hot reload). */
      const pin = root.querySelector("[data-morph-pin-pin]");
      if (pin instanceof HTMLElement && pin.style.marginTop) {
        pin.style.removeProperty("margin-top");
      }

      /* About Hero: đảm bảo ảnh ở vị trí đích luôn < 90% chiều rộng cột text
         trên MỌI màn hình. Cột text = min(vw, 768px) − 28px×2 padding.
         Với vw >= 768px: cột = 712px → 90% = 640.8px → endScale = min(0.6, 640.8 / vw).
         Với vw < 768px (mobile): không set gì — giữ nguyên default CSS 0.6, đảm bảo
         không thay đổi hành vi trên điện thoại. Đọc window.innerWidth — rẻ, không
         forced layout (không dùng getBoundingClientRect). */
      if (root.hasAttribute("data-about-hero-morph")) {
        const heroVw = window.visualViewport?.width ?? window.innerWidth;
        if (heroVw >= 768) {
          const endScale = Math.min(0.6, 640.8 / heroVw);
          setCssVar(root, "--morph-pin-image-end-scale", String(endScale));
        } else if (root.style.getPropertyValue("--morph-pin-image-end-scale")) {
          root.style.removeProperty("--morph-pin-image-end-scale");
        }
      }

      setCssVar(root, "--morph-pin-vvh", `${vvh}px`);
      setCssVar(root, "--morph-pin-p-letter", String(pLetter));
      setCssVar(root, "--morph-pin-p-image", String(pImage));
      setCssVar(root, "--morph-pin-p-shrink", String(pShrink));
      setCssVar(root, "--morph-pin-p-top", String(pTop));
      /* iOS: px thẳng; soft-stagger exit khi có letter phase (brand-break) */
      if (letterRatio > 0) {
        const vw = window.visualViewport?.width ?? window.innerWidth;
        const exitStagger = readCssNumber(
          root,
          "--brand-break-exit-stagger",
          0.1,
        );
        const exitFinish = readCssNumber(
          root,
          "--brand-break-exit-finish",
          1,
        );
        setCssVar(root, "--morph-pin-letter-x", letterExitPx(pLetter, vw));
        for (const [i, id] of (["top", "mid", "bot"] as const).entries()) {
          const p = staggerLetterExitProgress(
            pLetter,
            i,
            exitStagger,
            exitFinish,
          );
          setCssVar(root, `--morph-pin-letter-x-${id}`, letterExitPx(p, vw));
        }
      } else {
        setCssVar(root, "--morph-pin-letter-x", "0px");
      }

      /* Enter (logo phải → đích) — cùng kiểu so le với exit (top dẫn đầu,
         bot theo sau), đối xứng 2 chiều tự nhiên theo scrollTop, không cần
         timer/state machine riêng nữa. */
      if (isBrandBreak) {
        const vw = window.visualViewport?.width ?? window.innerWidth;
        const enterStagger = readCssNumber(
          root,
          "--brand-break-enter-stagger",
          0.12,
        );
        const enterFinish = readCssNumber(
          root,
          "--brand-break-enter-finish",
          1,
        );
        for (const [i, id] of (["top", "mid", "bot"] as const).entries()) {
          const p = staggerLetterExitProgress(
            pEnter,
            i,
            enterStagger,
            enterFinish,
          );
          setCssVar(root, `--morph-pin-enter-x-${id}`, enterOffsetPx(p, vw));
        }
        const nextLogo = pEnter >= 1 ? "rest" : "waiting";
        if (root.dataset.brandBreakLogo !== nextLogo) {
          root.dataset.brandBreakLogo = nextLogo;
        }
      }

      let contentShift = 0;
      if (lettersOut) {
        /* Đang chạm: giữ shift hiện tại — không đo (rect nhiễu). */
        if (touching) {
          contentShift = shiftRef.current;
        } else if (titleArrived) {
          if (frozenShiftRef.current === null) {
            const measured = measureContentShiftPx(
              root,
              titleGapPx,
              shiftRef.current,
            );
            frozenShiftRef.current =
              measured ?? targetShiftRef.current ?? shiftRef.current;
            if (measured !== null) targetShiftRef.current = measured;
          }
          contentShift = frozenShiftRef.current;
        } else {
          /*
           * Image phase: đo lại khi p-shrink/p-align đổi (đáy ảnh lên khi scale).
           * Pin (shrinkDone): geometry ổn → đo một lần rồi tái dùng.
           */
          const last = lastMeasureProgressRef.current;
          const progressMoved =
            Math.abs(pShrink - last.pShrink) > 0.02 ||
            Math.abs(pAlign - last.pAlign) > 0.02;
          const needMeasure =
            targetShiftRef.current === null ||
            (!shrinkDone && progressMoved) ||
            (shrinkDone && last.pShrink < 1 && progressMoved);

          if (needMeasure) {
            const measured = measureContentShiftPx(
              root,
              titleGapPx,
              shiftRef.current,
            );
            if (measured !== null) {
              targetShiftRef.current = measured;
              lastMeasureProgressRef.current = { pShrink, pAlign };
            }
          }

          const targetShift = targetShiftRef.current;
          if (targetShift !== null) {
            contentShift = pAlign * targetShift;
          }
        }
      }

      shiftRef.current = contentShift;

      setCssVar(root, "--morph-pin-collapse", `${alignUnstick}px`);
      setCssVar(root, "--morph-pin-content-shift", `${contentShift}px`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    const onTouchStart = () => {
      touching = true;
    };

    const onTouchEnd = () => {
      touching = false;
      /* Chờ browser settle — tránh đo ngay lúc nhấc tay (iOS). */
      if (touchEndFrame) cancelAnimationFrame(touchEndFrame);
      touchEndFrame = requestAnimationFrame(() => {
        touchEndFrame = 0;
        sync();
      });
    };

    const img = root.querySelector("[data-morph-pin-image] img");
    const onImageLoad = () => sync();

    sync();
    if (!enabled) {
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    img?.addEventListener("load", onImageLoad);
    const observer = new ResizeObserver(sync);
    observer.observe(root);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      img?.removeEventListener("load", onImageLoad);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (touchEndFrame) cancelAnimationFrame(touchEndFrame);
    };
  }, [enabled]);

  return rootRef;
}
