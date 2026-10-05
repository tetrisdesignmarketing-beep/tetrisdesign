/**
 * Helper dùng chung: header/viewport (thanh URL mobile), gesture hero trang chủ,
 * gate + reveal cho curtain dự án. Trang chủ giờ chỉ còn slider (đã bỏ paging
 * hero ↔ projects), các hàm snap/limbo A↔B đã xoá.
 */

/** Tỷ lệ chiều cao card phải lộ trong viewport để coi là “full visible” (tolerance sub-pixel) */
export const CARD_REVEAL_VISIBLE_RATIO = 0.92;

/** Fallback — card không đạt full nhưng đã lộ đủ lớn thì vẫn reveal (tránh che mãi) */
export const CARD_FALLBACK_VISIBLE_RATIO = 0.55;

/** Rest state A — hero full (`scrollY` tại đỉnh trang) */
export const HERO_REST_MAX_SCROLL_Y = 8;

/** Gesture chuyển section — đối xứng hero carousel */
export const SECTION_SWIPE_MIN = 28;
export const SECTION_AXIS_LOCK_MIN = 10;

export function getHeaderOffset(): number {
  if (typeof document === "undefined") return 90;
  return document.querySelector("header")?.getBoundingClientRect().height ?? 90;
}

function measureCssHeight(height: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;height:${height}`;
  document.documentElement.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
}

/** Fallback thanh URL/toolbar đáy (Safari / Zalo / Chrome) khi visualViewport không đo được */
export const SITE_URLBAR_BOTTOM_FALLBACK_PX = 112;

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

/** Khoảng layout viewport nhô xuống dưới visual viewport = thanh URL/toolbar đáy */
export function getUrlBarBottomInset(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  const layoutH = Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    measureCssHeight("100lvh"),
  );
  if (!vv) {
    return isMobileViewport() ? SITE_URLBAR_BOTTOM_FALLBACK_PX : 0;
  }
  const visualBottom = vv.offsetTop + vv.height;
  const measured = Math.max(0, Math.round(layoutH - visualBottom));
  if (measured > 1) return measured;
  return isMobileViewport() ? SITE_URLBAR_BOTTOM_FALLBACK_PX : 0;
}

/** Viewport nhỏ (`100svh`, thanh URL đang hiện) — không đổi khi iOS thu/nhả
 *  thanh URL. Dùng cho panel full-page scroll: panel luôn nằm gọn trong vùng
 *  thấy được và không bị đo lại giữa lúc scroll (scroll sẽ giật). */
export function getStableViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  const svh = measureCssHeight("100svh");
  if (svh > 0) return svh;
  return window.visualViewport?.height ?? window.innerHeight;
}

export function syncSiteViewportHeight(): void {
  const urlbar = getUrlBarBottomInset();
  document.documentElement.style.setProperty(
    "--site-urlbar-bottom",
    `${urlbar}px`,
  );
}

export function subscribeSiteViewportHeight(): () => void {
  const sync = () => syncSiteViewportHeight();
  sync();
  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("orientationchange", sync);
  window.visualViewport?.addEventListener("resize", sync);
  return () => {
    window.removeEventListener("resize", sync);
    window.removeEventListener("orientationchange", sync);
    window.visualViewport?.removeEventListener("resize", sync);
  };
}

export function getHomeScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "smooth";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/** Hero còn chiếm phần lớn viewport — Safari URL bar làm scrollY > 8 nhưng vẫn đang ở A */
export function isHeroGestureActive(): boolean {
  if (typeof window === "undefined") return true;
  if (window.scrollY <= HERO_REST_MAX_SCROLL_Y) return true;

  const hero = document.getElementById("hero-carousel");
  if (!hero) return false;

  const rect = hero.getBoundingClientRect();
  const viewH = window.innerHeight;
  return rect.top > -viewH * 0.2 && rect.bottom > viewH * 0.55;
}

export function getProjectsScrollTop(sectionId: string): number | null {
  const section = document.getElementById(sectionId);
  if (!section) return null;
  return Math.max(0, section.offsetTop - getHeaderOffset());
}

export function getWindowScrollY(): number {
  return Math.max(
    window.scrollY,
    document.documentElement.scrollTop,
    document.body?.scrollTop ?? 0,
  );
}

/** Chiều cao màn thực đang thấy — iOS trừ thanh URL (`vh` tính cả thanh này) */
export function getVisibleViewportHeight(): number {
  return (
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight
  );
}

/** Ngưỡng scroll mở cổng project — token `--home-project-gate-scroll-ratio` (0.5 = 50vh) */
export function readHomeProjectGateScrollY(root?: HTMLElement | null): number {
  const el = root ?? document.getElementById("home-projects");
  const raw = el
    ? getComputedStyle(el)
        .getPropertyValue("--home-project-gate-scroll-ratio")
        .trim()
    : "";
  const ratio = Number.parseFloat(raw);
  const resolved = Number.isFinite(ratio) && ratio > 0 ? ratio : 0.5;
  return getVisibleViewportHeight() * resolved;
}

/** Lần đầu tới `#home-projects`: scrollY ≥ 50vh, hoặc top section đã qua vạch 50vh */
export function isHomeProjectScrollGateOpen(
  section?: HTMLElement | null,
): boolean {
  const threshold = readHomeProjectGateScrollY(section);
  if (getWindowScrollY() >= threshold) return true;
  if (!section) return false;
  return section.getBoundingClientRect().top <= threshold;
}

/** Rest state B — luôn offset header, không bao giờ `top: 0` (P0 #4) */
export function scrollToProjectsAnchor(
  sectionId: string,
  behavior?: ScrollBehavior,
): void {
  const top = getProjectsScrollTop(sectionId);
  if (top === null) return;

  const headerOffset = getHeaderOffset();
  const safeTop = Math.max(headerOffset, top);

  const resolved = behavior ?? getHomeScrollBehavior();
  window.scrollTo({ top: safeTop, behavior: resolved });
}

/** Inner scroller của full-page pager (`data-fps-inner-scroll`) — Home không có */
export function getCurtainScrollRoot(el: HTMLElement): HTMLElement | null {
  const root = el.closest("[data-fps-inner-scroll]");
  return root instanceof HTMLElement ? root : null;
}

function getViewportClip(
  headerOffset: number,
  root?: HTMLElement | null,
): { top: number; bottom: number } {
  if (root) {
    const rect = root.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  }

  const mobile = isMobileViewport();
  const slack = mobile ? 28 : 4;
  const vv = window.visualViewport;
  const bottom = vv
    ? vv.offsetTop + vv.height
    : window.innerHeight;

  return { top: headerOffset, bottom: bottom + slack };
}

/**
 * Một card đã lộ hết chiều cao trên màn (dưới menu).
 * Mobile: slack đáy (URL bar); card cao hơn viewport → đủ khi lấp vùng còn lại.
 */
export function isCardFullyOnScreen(
  el: HTMLElement,
  headerOffset: number,
  minRatio = CARD_REVEAL_VISIBLE_RATIO,
  root?: HTMLElement | null,
): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0) return false;

  const { top: clipTop, bottom: clipBottom } = getViewportClip(
    headerOffset,
    root,
  );
  const available = Math.max(0, clipBottom - clipTop);
  if (available <= 0) return false;

  const visible = Math.max(
    0,
    Math.min(rect.bottom, clipBottom) - Math.max(rect.top, clipTop),
  );

  if (rect.height > available) {
    return visible >= available * minRatio;
  }

  return visible / rect.height >= minRatio;
}

/** Phần card đang lộ (0–1) — viewport dưới header, hoặc clip theo inner-scroll root */
export function getCardVisibleRatio(
  el: HTMLElement,
  headerOffset: number,
  root?: HTMLElement | null,
): number {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0) return 0;

  const { top: clipTop, bottom: clipBottom } = getViewportClip(
    headerOffset,
    root,
  );

  const visibleTop = Math.max(rect.top, clipTop);
  const visibleBottom = Math.min(rect.bottom, clipBottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  return visibleHeight / rect.height;
}

export function isCardSubstantiallyVisible(
  el: HTMLElement,
  headerOffset: number,
  minRatio = CARD_FALLBACK_VISIBLE_RATIO,
  root?: HTMLElement | null,
): boolean {
  return getCardVisibleRatio(el, headerOffset, root) >= minRatio;
}
