"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { hasMediaVariants, mediaVariantUrl } from "@/lib/media-variants";
import { Button } from "@/components/ui/button";

/*
 * Lightbox kiểu mở/đóng app iOS:
 * - Mở: ảnh "bay" từ đúng ô trong trang ra giữa màn hình (FLIP: transform +
 *   clip-path, chỉ thuộc tính GPU), nền đen hiện dần, nút điều khiển hiện sau.
 * - Đóng: ảnh bay ngược về ô của ảnh đang xem.
 * - Vuốt ảnh xuống: ảnh nhỏ dần theo ngón tay, nền mờ dần; thả đủ xa/nhanh thì
 *   đóng (bay về ô), chưa đủ thì bật về chỗ cũ.
 * Không tìm được ô (canvas, ô nằm ngoài màn hình) → phóng nhẹ + mờ dần tại chỗ.
 * Màn cảm ứng: chụm 2 ngón / chạm đúp để phóng to, 1 ngón kéo khi đang phóng
 * (lớp __zoom riêng trong khung → không đụng hiệu ứng bay của khung).
 */

const OPEN_MS = 420;
const CLOSE_MS = 360;
const SPRING_BACK_MS = 300;
const CHROME_IN_MS = 220;
const CHROME_OUT_MS = 120;
const FADE_ONLY_MS = 180;
/** Gần đường cong lò xo khi mở/đóng app iOS: lao nhanh, hãm rất êm.
 *  Nguồn chính: token CSS `--ease-ios` (globals.css) — giá trị này chỉ là dự phòng. */
const IOS_EASE_FALLBACK = "cubic-bezier(0.32, 0.72, 0, 1)";
let iosEaseCache: string | null = null;
/** Web Animations API không đọc được var() → lấy giá trị token 1 lần. */
function iosEase(): string {
  if (iosEaseCache === null) {
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-ios")
      .trim();
    iosEaseCache = token || IOS_EASE_FALLBACK;
  }
  return iosEaseCache;
}

const SWIPE_MIN_PX = 48;
/** Di chuyển tối thiểu trước khi quyết định vuốt ngang (đổi ảnh) hay dọc (đóng). */
const AXIS_LOCK_PX = 10;
const DISMISS_DISTANCE_PX = 110;
const DISMISS_VELOCITY_PX_MS = 0.55;
const DRAG_MIN_SCALE = 0.7;
const FALLBACK_SCALE = 0.9;
/** Ô gốc phải hiện ít nhất chừng này diện tích mới "bay" về được. */
const ORIGIN_MIN_VISIBLE = 0.35;
/** iOS ghost-click sau unmount — giữ khóa header để khỏi mở menu. */
const HEADER_LOCK_AFTER_CLOSE_MS = 600;

type Phase = "closed" | "open" | "closing";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Viewport {
  w: number;
  h: number;
}

interface DragState {
  id: number;
  x0: number;
  y0: number;
  axis: "x" | "y" | "none" | null;
  dx: number;
  dy: number;
  lastY: number;
  lastT: number;
  vy: number;
}

/* Phóng to trên màn cảm ứng. */
const ZOOM_MAX = 4;
const ZOOM_DOUBLE_TAP = 2.5;
/** Dưới mức này coi như 1× (thả tay → về cỡ gốc, bật lại vuốt đổi ảnh / đóng). */
const ZOOM_EPSILON = 1.02;
const ZOOM_SETTLE_MS = 260;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;
const TAP_MOVE_PX = 10;
/** Kéo quá mép khi đang phóng → lực cản (chỉ đi 35% quãng vượt). */
const ZOOM_RUBBER = 0.35;

interface ZoomState {
  s: number;
  x: number;
  y: number;
}

type ZoomGesture =
  | {
      kind: "pinch";
      s0: number;
      x0: number;
      y0: number;
      mid0: { x: number; y: number };
      dist0: number;
    }
  | { kind: "pan"; id: number; px: number; py: number; x0: number; y0: number };

const REST_TRANSFORM = "translate3d(0px, 0px, 0px) scale(1)";
const REST_CLIP = "inset(0px 0px 0px 0px)";

function readViewport(): Viewport {
  return {
    w: document.documentElement.clientWidth || window.innerWidth,
    h: window.innerHeight,
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Khung ảnh vừa khít màn hình theo tỷ lệ (giống object-contain). */
function fitContain(view: Viewport, ratio: number | null): Box {
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
    return { x: 0, y: 0, w: view.w, h: view.h };
  }
  let w = view.w;
  let h = w / ratio;
  if (h > view.h) {
    h = view.h;
    w = h * ratio;
  }
  return { x: (view.w - w) / 2, y: (view.h - h) / 2, w, h };
}

function readOriginRatio(el: HTMLElement | null | undefined): number | null {
  if (!el) return null;
  for (const img of Array.from(el.querySelectorAll("img"))) {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img.naturalWidth / img.naturalHeight;
    }
  }
  return null;
}

/** Vị trí ô gốc trên màn hình — `null` nếu không đủ lộ để bay về. */
function visibleBox(
  el: HTMLElement | null | undefined,
  view: Viewport,
): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  const vx = Math.max(0, Math.min(r.right, view.w) - Math.max(r.left, 0));
  const vy = Math.max(0, Math.min(r.bottom, view.h) - Math.max(r.top, 0));
  if ((vx * vy) / (r.width * r.height) < ORIGIN_MIN_VISIBLE) return null;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/**
 * Tư thế của khung ảnh khi "nằm" đúng trong ô gốc: phóng đều (không méo) cho
 * phủ kín ô, dời tâm về tâm ô, rồi cắt (clip-path) phần thừa theo hình ô —
 * khớp với ảnh object-cover trong lưới.
 */
function originPose(frame: Box, origin: Box) {
  const s = Math.max(origin.w / frame.w, origin.h / frame.h);
  const insetX = Math.max(0, (frame.w - origin.w / s) / 2);
  const insetY = Math.max(0, (frame.h - origin.h / s) / 2);
  const tx = origin.x + origin.w / 2 - (frame.x + frame.w / 2);
  const ty = origin.y + origin.h / 2 - (frame.y + frame.h / 2);
  return {
    transform: `translate3d(${tx}px, ${ty}px, 0px) scale(${s})`,
    clipPath: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px)`,
  };
}

interface ProjectDetailLightboxProps {
  images: string[];
  title: string;
  /** Index ảnh được click — `null` = đóng. */
  index: number | null;
  onClose: () => void;
  /** Ô ảnh trong trang ứng với index — để ảnh bay ra/về đúng chỗ. */
  getOriginElement?: (index: number) => HTMLElement | null;
  /**
   * Đóng ở ảnh có ô nằm ngoài màn hình → cuộn trang (khuất sau nền đen) cho ô
   * hiện ra rồi bay về, như app Ảnh của iOS. Tắt cho lưới có hiệu ứng theo cuộn.
   */
  scrollOriginIntoView?: boolean;
}

export function ProjectDetailLightbox({
  images,
  title,
  index,
  onClose,
  getOriginElement,
  scrollOriginIntoView = false,
}: ProjectDetailLightboxProps) {
  const mounted = useIsClient();
  const count = images.length;
  const [phase, setPhase] = useState<Phase>("closed");
  const [current, setCurrent] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [viewport, setViewport] = useState<Viewport>({ w: 0, h: 0 });
  const [openToken, setOpenToken] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  /* Hiệu ứng đang chạy (mở / bật về) — để ĐẢO CHIỀU được giữa chừng thay vì
     khoá thao tác: bấm X / Esc / vuốt khi đang mở → đóng ngay từ vị trí hiện tại. */
  const runningRef = useRef<Animation[]>([]);
  /* Mỗi lần đổi hiệu ứng tăng số này → callback "xong" của hiệu ứng cũ (bị huỷ)
     không chạy nhầm (vd. hiện lại ô gốc khi đang bay về). */
  const animGenRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const hiddenOriginRef = useRef<HTMLElement | null>(null);
  const headerLockTimerRef = useRef<number | null>(null);

  /* Mở / đóng theo prop `index` (chỉnh state ngay trong render). Đọc tỷ lệ ảnh
     từ ô gốc ngay lúc mở để khung ảnh đúng kích thước ở khung hình đầu tiên. */
  const requested =
    index !== null && count > 0 ? ((index % count) + count) % count : null;
  const [prevRequested, setPrevRequested] = useState<number | null>(null);
  if (requested !== prevRequested) {
    setPrevRequested(requested);
    if (requested === null) {
      setPhase("closed");
    } else {
      setCurrent(requested);
      setPhase("open");
      setViewport(readViewport());
      const ratio = readOriginRatio(getOriginElement?.(requested));
      if (ratio) {
        setRatios((prev) =>
          prev[requested] === ratio ? prev : { ...prev, [requested]: ratio },
        );
      }
      setOpenToken((token) => token + 1);
    }
  }

  const ratio = ratios[current] ?? null;
  const frame = fitContain(viewport, ratio);
  const visible = phase !== "closed";

  const latestRef = useRef({
    phase,
    current,
    frame,
    hasRatio: ratio !== null,
    getOriginElement,
    scrollOriginIntoView,
    onClose,
  });
  useLayoutEffect(() => {
    latestRef.current = {
      phase,
      current,
      frame,
      hasRatio: ratio !== null,
      getOriginElement,
      scrollOriginIntoView,
      onClose,
    };
  });

  /* ---------- Phóng to (chỉ cảm ứng) ---------- */
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomState>({ s: 1, x: 0, y: 0 });
  const zoomGestureRef = useRef<ZoomGesture | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  /** Có 2 ngón / đang kéo khi phóng → ngón còn lại không được tính là vuốt đổi ảnh. */
  const zoomTouchedRef = useRef(false);

  const isZoomed = () => zoomRef.current.s > ZOOM_EPSILON;

  /**
   * Giới hạn dịch chuyển: ảnh phóng nhỏ hơn màn hình theo 1 chiều → căn giữa
   * màn hình theo chiều đó; lớn hơn → không cho lộ khoảng đen ở mép.
   * `rubber` = cho vượt mép có lực cản (đang kéo), không thì chặn cứng.
   */
  const clampZoom = useCallback((z: ZoomState, rubber: boolean): ZoomState => {
    const box = latestRef.current.frame;
    const view = readViewport();
    /* Chặn cứng (thả tay) → không vượt mức phóng tối đa. */
    const scale = rubber ? z.s : Math.min(z.s, ZOOM_MAX);
    const axis = (t: number, origin: number, size: number, viewSize: number) => {
      const scaled = size * scale;
      if (scaled <= viewSize) return (viewSize - scaled) / 2 - origin;
      const max = -origin;
      const min = viewSize - origin - scaled;
      if (t > max) return rubber ? max + (t - max) * ZOOM_RUBBER : max;
      if (t < min) return rubber ? min + (t - min) * ZOOM_RUBBER : min;
      return t;
    };
    if (scale <= 1) return { s: 1, x: 0, y: 0 };
    return {
      s: scale,
      x: axis(z.x, box.x, box.w, view.w),
      y: axis(z.y, box.y, box.h, view.h),
    };
  }, []);

  const applyZoom = useCallback((z: ZoomState, animate: boolean) => {
    zoomRef.current = z;
    const layer = zoomLayerRef.current;
    const frameEl = frameRef.current;
    if (!layer || !frameEl) return;
    layer.style.transition = animate
      ? `transform ${ZOOM_SETTLE_MS}ms ${iosEase()}`
      : "";
    layer.style.transform =
      z.s === 1 && z.x === 0 && z.y === 0
        ? ""
        : `translate3d(${z.x}px, ${z.y}px, 0px) scale(${z.s})`;
    /* Đang phóng: khung bỏ cắt mép để ảnh to ra hết màn hình. */
    if (z.s > 1) {
      frameEl.setAttribute("data-zoomed", "");
      frameEl.style.clipPath = "none";
    } else {
      frameEl.removeAttribute("data-zoomed");
      if (frameEl.style.clipPath === "none") frameEl.style.clipPath = "";
    }
  }, []);

  const resetZoom = useCallback(
    (animate: boolean) => {
      zoomGestureRef.current = null;
      if (zoomRef.current.s === 1 && !zoomLayerRef.current?.style.transform) {
        return;
      }
      applyZoom({ s: 1, x: 0, y: 0 }, animate);
    },
    [applyZoom],
  );

  /** Thả tay: dưới ngưỡng → về 1×; còn lại chặn trong mép (có hiệu ứng). */
  const settleZoom = useCallback(() => {
    const z = zoomRef.current;
    if (z.s <= ZOOM_EPSILON) resetZoom(true);
    else applyZoom(clampZoom(z, false), true);
  }, [applyZoom, clampZoom, resetZoom]);

  /** Phóng tới `scale` sao cho điểm màn hình (cx, cy) đứng yên dưới ngón tay. */
  const zoomAt = useCallback(
    (scale: number, cx: number, cy: number) => {
      const box = latestRef.current.frame;
      const z = zoomRef.current;
      const px = (cx - box.x - z.x) / z.s;
      const py = (cy - box.y - z.y) / z.s;
      applyZoom(
        clampZoom(
          { s: scale, x: cx - box.x - scale * px, y: cy - box.y - scale * py },
          false,
        ),
        true,
      );
    },
    [applyZoom, clampZoom],
  );

  /* Đổi ảnh / đóng / mở lại → luôn về 1×. */
  useEffect(() => {
    resetZoom(false);
    pointersRef.current.clear();
    lastTapRef.current = null;
  }, [current, phase, openToken, resetZoom]);

  const hideOrigin = useCallback((el: HTMLElement | null) => {
    const prev = hiddenOriginRef.current;
    if (prev && prev !== el) prev.style.visibility = "";
    hiddenOriginRef.current = el;
    if (el) el.style.visibility = "hidden";
  }, []);

  const trackAnimations = useCallback((animations: Animation[]) => {
    runningRef.current = animations;
    animGenRef.current += 1;
    return animGenRef.current;
  }, []);

  /** Dừng hiệu ứng đang chạy, giữ nguyên tư thế hiện tại (ghi vào inline style). */
  const interruptRunning = useCallback(() => {
    for (const animation of runningRef.current) {
      if (animation.playState === "finished") continue;
      try {
        animation.commitStyles();
      } catch {
        /* phần tử không còn hiển thị — bỏ qua */
      }
      animation.cancel();
    }
    runningRef.current = [];
    animGenRef.current += 1;
  }, []);

  /* ---------- Mở: bay từ ô ra ---------- */
  useLayoutEffect(() => {
    if (openToken === 0) return;
    const root = rootRef.current;
    const frameEl = frameRef.current;
    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    if (!root || !frameEl || !backdrop || !chrome) return;

    busyRef.current = true;
    let gen = 0;
    const done = () => {
      if (animGenRef.current !== gen) return;
      runningRef.current = [];
      busyRef.current = false;
      hideOrigin(null);
    };

    if (prefersReducedMotion()) {
      const fade = root.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: FADE_ONLY_MS,
        easing: "ease-out",
      });
      gen = trackAnimations([fade]);
      fade.finished.then(done, done);
      return;
    }

    const latest = latestRef.current;
    const originEl = latest.getOriginElement?.(latest.current) ?? null;
    const originBox = latest.hasRatio
      ? visibleBox(originEl, readViewport())
      : null;

    let flight: Animation;
    if (originBox) {
      hideOrigin(originEl);
      flight = frameEl.animate(
        [
          originPose(latest.frame, originBox),
          { transform: REST_TRANSFORM, clipPath: REST_CLIP },
        ],
        { duration: OPEN_MS, easing: iosEase() },
      );
    } else {
      flight = frameEl.animate(
        [
          {
            transform: `translate3d(0px, 0px, 0px) scale(${FALLBACK_SCALE})`,
            opacity: 0,
          },
          { transform: REST_TRANSFORM, opacity: 1 },
        ],
        { duration: OPEN_MS, easing: iosEase() },
      );
    }
    const backdropFade = backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: OPEN_MS,
      easing: "ease-out",
    });
    const chromeFade = chrome.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: CHROME_IN_MS,
      delay: OPEN_MS * 0.45,
      easing: "ease-out",
      fill: "backwards",
    });
    gen = trackAnimations([flight, backdropFade, chromeFade]);
    flight.finished.then(done, done);
  }, [openToken, hideOrigin, trackAnimations]);

  /* ---------- Đóng: bay về ô (từ vị trí hiện tại, kể cả đang kéo) ---------- */
  const requestClose = useCallback(() => {
    const latest = latestRef.current;
    if (latest.phase !== "open") return;
    /* Đang phóng → về 1× ngay để ảnh bay về ô đúng khung. */
    resetZoom(false);
    /* Đang mở dở / đang bật về → dừng tại chỗ rồi bay về từ đúng vị trí đó. */
    if (busyRef.current) interruptRunning();
    const root = rootRef.current;
    const frameEl = frameRef.current;
    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    if (!root || !frameEl || !backdrop || !chrome) {
      latest.onClose();
      return;
    }

    busyRef.current = true;
    setPhase("closing");
    const finish = () => {
      hideOrigin(null);
      busyRef.current = false;
      latestRef.current.onClose();
    };

    if (prefersReducedMotion()) {
      const startRoot = root.style.opacity || "1";
      root.style.opacity = "";
      root
        .animate([{ opacity: startRoot }, { opacity: 0 }], {
          duration: FADE_ONLY_MS,
          easing: "ease-in",
          fill: "forwards",
        })
        .finished.then(finish, finish);
      return;
    }

    const view = readViewport();
    const originEl = latest.getOriginElement?.(latest.current) ?? null;
    let originBox = latest.hasRatio ? visibleBox(originEl, view) : null;
    if (
      !originBox &&
      latest.hasRatio &&
      originEl &&
      latest.scrollOriginIntoView
    ) {
      const r = originEl.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + r.top - (view.h - r.height) / 2,
        behavior: "instant",
      });
      originBox = visibleBox(originEl, view);
    }

    const startTransform = frameEl.style.transform || REST_TRANSFORM;
    const startClip = frameEl.style.clipPath || REST_CLIP;
    const startOpacity = frameEl.style.opacity || "1";
    const startBackdrop = backdrop.style.opacity || "1";
    const startChrome = chrome.style.opacity || "1";
    frameEl.style.transform = "";
    frameEl.style.clipPath = "";
    frameEl.style.opacity = "";
    backdrop.style.opacity = "";
    chrome.style.opacity = "";

    let flight: Animation;
    if (originBox) {
      hideOrigin(originEl);
      flight = frameEl.animate(
        [
          {
            transform: startTransform,
            clipPath: startClip,
            opacity: startOpacity,
          },
          { ...originPose(latest.frame, originBox), opacity: 1 },
        ],
        { duration: CLOSE_MS, easing: iosEase(), fill: "forwards" },
      );
    } else {
      flight = frameEl.animate(
        [
          { transform: startTransform, opacity: startOpacity },
          {
            transform: `${startTransform} scale(${FALLBACK_SCALE})`,
            opacity: 0,
          },
        ],
        { duration: CLOSE_MS, easing: iosEase(), fill: "forwards" },
      );
    }
    backdrop.animate([{ opacity: startBackdrop }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: "ease-out",
      fill: "forwards",
    });
    chrome.animate([{ opacity: startChrome }, { opacity: 0 }], {
      duration: CHROME_OUT_MS,
      easing: "ease-out",
      fill: "forwards",
    });
    flight.finished.then(finish, finish);
  }, [hideOrigin, interruptRunning, resetZoom]);

  /* ---------- Vuốt xuống chưa đủ → bật về ---------- */
  const springBack = useCallback(() => {
    const frameEl = frameRef.current;
    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    if (!frameEl || !backdrop || !chrome) return;
    const startTransform = frameEl.style.transform || REST_TRANSFORM;
    const startBackdrop = backdrop.style.opacity || "1";
    const startChrome = chrome.style.opacity || "1";
    frameEl.style.transform = "";
    backdrop.style.opacity = "";
    chrome.style.opacity = "";
    busyRef.current = true;
    const options = { duration: SPRING_BACK_MS, easing: iosEase() };
    const flight = frameEl.animate(
      [{ transform: startTransform }, { transform: REST_TRANSFORM }],
      options,
    );
    const backdropFade = backdrop.animate(
      [{ opacity: startBackdrop }, { opacity: 1 }],
      options,
    );
    const chromeFade = chrome.animate(
      [{ opacity: startChrome }, { opacity: 1 }],
      options,
    );
    const gen = trackAnimations([flight, backdropFade, chromeFade]);
    const done = () => {
      if (animGenRef.current !== gen) return;
      runningRef.current = [];
      busyRef.current = false;
    };
    flight.finished.then(done, done);
  }, [trackAnimations]);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0 || busyRef.current) return;
      const target = ((next % count) + count) % count;
      const learned = readOriginRatio(
        latestRef.current.getOriginElement?.(target),
      );
      if (learned) {
        setRatios((prev) =>
          prev[target] ? prev : { ...prev, [target]: learned },
        );
      }
      setCurrent(target);
    },
    [count],
  );

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);

  /* Ảnh chưa biết tỷ lệ (ô gốc chưa tải / không có ô) → đọc từ bản thu nhỏ. */
  useEffect(() => {
    if (!visible) return;
    const src = images[current];
    if (!src || ratios[current]) return;
    let cancelled = false;
    const probe = new Image();
    probe.decoding = "async";
    probe.onload = () => {
      if (cancelled || !probe.naturalWidth || !probe.naturalHeight) return;
      const learned = probe.naturalWidth / probe.naturalHeight;
      setRatios((prev) =>
        prev[current] ? prev : { ...prev, [current]: learned },
      );
    };
    probe.onerror = () => {
      if (!cancelled && probe.src !== src) probe.src = src;
    };
    probe.src = hasMediaVariants(src) ? mediaVariantUrl(src, 480) : src;
    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [visible, current, images, ratios]);

  /* Khoá cuộn trang + header khi lightbox hiện. */
  useEffect(() => {
    if (!visible) return;
    if (headerLockTimerRef.current !== null) {
      window.clearTimeout(headerLockTimerRef.current);
      headerLockTimerRef.current = null;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.setAttribute("data-lightbox-open", "");
    const onResize = () => setViewport(readViewport());
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      headerLockTimerRef.current = window.setTimeout(() => {
        document.documentElement.removeAttribute("data-lightbox-open");
        headerLockTimerRef.current = null;
      }, HEADER_LOCK_AFTER_CLOSE_MS);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, requestClose, goPrev, goNext]);

  useEffect(() => {
    return () => {
      if (headerLockTimerRef.current !== null) {
        window.clearTimeout(headerLockTimerRef.current);
        headerLockTimerRef.current = null;
      }
      document.documentElement.removeAttribute("data-lightbox-open");
      if (hiddenOriginRef.current) {
        hiddenOriginRef.current.style.visibility = "";
        hiddenOriginRef.current = null;
      }
    };
  }, []);

  /* ---------- Cử chỉ: ngang = đổi ảnh, xuống = kéo để đóng ---------- */
  const applyDrag = (dx: number, dy: number) => {
    const frameEl = frameRef.current;
    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    if (!frameEl || !backdrop || !chrome) return;
    /* Kéo lên: có lực cản; kéo xuống: ảnh nhỏ dần, nền mờ dần. */
    const y = dy < 0 ? dy * 0.25 : dy;
    const progress = Math.min(1, Math.max(0, y / (readViewport().h * 0.6)));
    const scale = 1 - (1 - DRAG_MIN_SCALE) * progress;
    frameEl.style.transform = `translate3d(${dx}px, ${y}px, 0px) scale(${scale})`;
    backdrop.style.opacity = String(1 - progress);
    chrome.style.opacity = String(Math.max(0, 1 - progress * 4));
  };

  const capturePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer đã kết thúc */
    }
  };

  const startPan = (id: number, x: number, y: number) => {
    const z = zoomRef.current;
    zoomGestureRef.current = { kind: "pan", id, px: x, py: y, x0: z.x, y0: z.y };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (busyRef.current || latestRef.current.phase !== "open") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType !== "mouse") {
      const pointers = pointersRef.current;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        /* Ngón thứ 2 → chụm phóng; huỷ vuốt đóng / đổi ảnh đang dở. */
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.axis === "y") springBack();
        const [a, b] = [...pointers.values()];
        const z = zoomRef.current;
        zoomGestureRef.current = {
          kind: "pinch",
          s0: z.s,
          x0: z.x,
          y0: z.y,
          mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          dist0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        };
        zoomTouchedRef.current = true;
        capturePointer(event);
        return;
      }
      if (pointers.size > 2) return;
      zoomTouchedRef.current = false;
      if (isZoomed()) {
        startPan(event.pointerId, event.clientX, event.clientY);
        zoomTouchedRef.current = true;
        capturePointer(event);
        /* Vẫn ghi lại điểm chạm để nhận chạm đúp (thu nhỏ). */
        dragRef.current = {
          id: event.pointerId,
          x0: event.clientX,
          y0: event.clientY,
          axis: "none",
          dx: 0,
          dy: 0,
          lastY: event.clientY,
          lastT: event.timeStamp,
          vy: 0,
        };
        return;
      }
    }
    dragRef.current = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      axis: null,
      dx: 0,
      dy: 0,
      lastY: event.clientY,
      lastT: event.timeStamp,
      vy: 0,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const gesture = zoomGestureRef.current;
    if (gesture?.kind === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const box = latestRef.current.frame;
      /* Cho thu dưới 1× / vượt tối đa một chút (có cản), thả tay sẽ bật về. */
      let s = gesture.s0 * (dist / gesture.dist0);
      if (s < 1) s = 1 - (1 - s) * ZOOM_RUBBER;
      if (s > ZOOM_MAX) s = ZOOM_MAX + (s - ZOOM_MAX) * ZOOM_RUBBER;
      /* Điểm ảnh dưới tâm 2 ngón lúc bắt đầu luôn đi theo tâm 2 ngón. */
      const px = (gesture.mid0.x - box.x - gesture.x0) / gesture.s0;
      const py = (gesture.mid0.y - box.y - gesture.y0) / gesture.s0;
      applyZoom(
        clampZoom(
          { s, x: mid.x - box.x - s * px, y: mid.y - box.y - s * py },
          true,
        ),
        false,
      );
      return;
    }
    if (gesture?.kind === "pan" && gesture.id === event.pointerId) {
      const drag = dragRef.current;
      if (drag && drag.id === event.pointerId) {
        drag.dx = event.clientX - drag.x0;
        drag.dy = event.clientY - drag.y0;
      }
      applyZoom(
        clampZoom(
          {
            s: zoomRef.current.s,
            x: gesture.x0 + event.clientX - gesture.px,
            y: gesture.y0 + event.clientY - gesture.py,
          },
          true,
        ),
        false,
      );
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    drag.dx = event.clientX - drag.x0;
    drag.dy = event.clientY - drag.y0;
    const dt = event.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.vy = (event.clientY - drag.lastY) / dt;
      drag.lastY = event.clientY;
      drag.lastT = event.timeStamp;
    }
    if (drag.axis === null) {
      if (
        Math.abs(drag.dx) < AXIS_LOCK_PX &&
        Math.abs(drag.dy) < AXIS_LOCK_PX
      ) {
        return;
      }
      drag.axis =
        Math.abs(drag.dy) > Math.abs(drag.dx)
          ? drag.dy > 0
            ? "y"
            : "none"
          : "x";
      if (drag.axis === "y") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* pointer đã kết thúc */
        }
      }
    }
    if (drag.axis === "y") applyDrag(drag.dx, drag.dy);
  };

  /** Thả 1 ngón trong lúc phóng / chụm. Trả về true nếu đã xử lý xong. */
  const releaseZoomPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);
    const gesture = zoomGestureRef.current;
    if (gesture?.kind === "pinch") {
      if (pointers.size === 1) {
        /* Còn 1 ngón: đang phóng thì chuyển sang kéo, không thì chờ thả. */
        const [[id, point]] = [...pointers.entries()];
        if (zoomRef.current.s > ZOOM_EPSILON) {
          applyZoom(clampZoom(zoomRef.current, false), true);
          startPan(id, point.x, point.y);
        } else {
          zoomGestureRef.current = null;
          settleZoom();
        }
      } else if (pointers.size === 0) {
        zoomGestureRef.current = null;
        settleZoom();
      }
      return true;
    }
    if (gesture?.kind === "pan" && gesture.id === event.pointerId) {
      zoomGestureRef.current = null;
      settleZoom();
      return false; /* vẫn cho kiểm tra chạm đúp bên dưới */
    }
    return pointers.size > 0 || zoomTouchedRef.current;
  };

  /** Chạm đúp (cảm ứng): đang 1× → phóng 2.5× tại điểm chạm; đang phóng → về 1×. */
  const handleTap = (event: ReactPointerEvent<HTMLDivElement>) => {
    const now = event.timeStamp;
    const last = lastTapRef.current;
    if (
      last &&
      now - last.t < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) <
        DOUBLE_TAP_SLOP_PX
    ) {
      lastTapRef.current = null;
      if (isZoomed()) resetZoom(true);
      else zoomAt(ZOOM_DOUBLE_TAP, event.clientX, event.clientY);
      return;
    }
    lastTapRef.current = { t: now, x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      const drag = dragRef.current;
      const handled = releaseZoomPointer(event);
      const isTap =
        drag !== null &&
        drag.id === event.pointerId &&
        Math.abs(event.clientX - drag.x0) < TAP_MOVE_PX &&
        Math.abs(event.clientY - drag.y0) < TAP_MOVE_PX;
      if (isTap && pointersRef.current.size === 0) handleTap(event);
      if (handled || isZoomed() || zoomTouchedRef.current) {
        if (drag?.id === event.pointerId) dragRef.current = null;
        if (pointersRef.current.size === 0) zoomTouchedRef.current = false;
        return;
      }
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    if (drag.axis === "y") {
      if (drag.dy > DISMISS_DISTANCE_PX || drag.vy > DISMISS_VELOCITY_PX_MS) {
        requestClose();
      } else {
        springBack();
      }
      return;
    }
    if (drag.axis === "x") {
      if (drag.dx > SWIPE_MIN_PX) goPrev();
      else if (drag.dx < -SWIPE_MIN_PX) goNext();
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      pointersRef.current.delete(event.pointerId);
      if (zoomGestureRef.current && pointersRef.current.size === 0) {
        zoomGestureRef.current = null;
        zoomTouchedRef.current = false;
        settleZoom();
      }
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    if (drag.axis === "y") springBack();
  };

  if (!mounted || !visible) return null;

  const src = images[current];
  if (!src) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="project-detail-lightbox"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${title}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        ref={backdropRef}
        className="project-detail-lightbox__backdrop"
        aria-hidden
      />

      <div
        className="project-detail-lightbox__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          ref={frameRef}
          className="project-detail-lightbox__frame"
          style={{
            left: frame.x,
            top: frame.y,
            width: frame.w,
            height: frame.h,
          }}
        >
          {/* Vị trí ghi inline (không chỉ CSS): thiếu CSS thì lớp này cao 0 →
              khi có transform, ảnh absolute co theo và biến mất. */}
          <div
            ref={zoomLayerRef}
            className="project-detail-lightbox__zoom"
            style={{ position: "absolute", inset: 0, transformOrigin: "0 0" }}
          >
            <ProgressiveImage
              key={`${src}-${current}`}
              src={src}
              alt={`${title} — ${current + 1}`}
              previewWidth={CANVAS_PREVIEW_WIDTH}
              fullWidth={CANVAS_FULL_WIDTH}
              sizes="100vw"
              priority
              /* Khung đã đúng tỷ lệ ảnh → cover = contain; chưa biết tỷ lệ thì
                 khung phủ màn hình và ảnh contain. */
              className={ratio ? "object-cover" : "object-contain"}
            />
          </div>
        </div>
      </div>

      <div ref={chromeRef} className="project-detail-lightbox__chrome">
        <p className="project-detail-lightbox__count ts-caption">
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(count).padStart(2, "0")}
        </p>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="project-detail-lightbox__close hover:bg-[#7a1f27] hover:text-white"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestClose();
          }}
          aria-label="Đóng"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </Button>

        {count > 1 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="project-detail-lightbox__nav project-detail-lightbox__nav--prev"
              onClick={goPrev}
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="project-detail-lightbox__nav project-detail-lightbox__nav--next"
              onClick={goNext}
              aria-label="Ảnh sau"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
