"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { SiteNavLinks, type MobileMenuPhase } from "@/components/site/site-nav-links";
import { cn } from "@/lib/utils";

/** Chrome (logo/icon/header) trước, panel opaque, rồi links stagger */
export const MENU_CHROME_MS = 300;
export const MENU_LINK_STAGGER_MS = 50;
export const MENU_LINK_ANIM_MS = 300;
export const MENU_LINKS_CLOSE_MS = 180;

export const MENU_OPEN_SEQUENCE_MS =
  MENU_CHROME_MS + MENU_LINK_ANIM_MS + 5 * MENU_LINK_STAGGER_MS;

/** Panel giữ opaque đến hết — tránh carousel flash khi chrome revert (P2 #9) */
export const MENU_CLOSE_SEQUENCE_MS = MENU_LINKS_CLOSE_MS + MENU_CHROME_MS;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MENU_PANEL_ID = "site-mobile-menu";
/** Hash "không trùng id nào" — gỡ `:target` khỏi panel khi chưa có JS */
const MENU_CLOSED_HASH = "site-mobile-menu-closed";

/** Chống double-toggle khi cả onClick lẫn fallback toạ độ cùng bắn */
const TOGGLE_DEBOUNCE_MS = 400;
/** Tap = di chuyển ngắn + nhanh (phân biệt với swipe hero/paging) */
const TAP_MOVE_MAX_PX = 12;
const TAP_DURATION_MAX_MS = 600;

function isPointInsideNode(node: HTMLElement | null, x: number, y: number) {
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  );
}

function clearMenuHash() {
  const hash = window.location.hash.slice(1);
  if (hash !== MENU_PANEL_ID && hash !== MENU_CLOSED_HASH) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

export type { MobileMenuPhase };

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServer() {
  return false;
}

/** Chỉ portal sau khi client mount — server render panel trong header (fallback
    `:target`), không cần setState trong effect. */
function subscribeNever() {
  return () => {};
}

function getMountedClient() {
  return true;
}

function getMountedServer() {
  return false;
}

interface MobileNavProps {
  lightChrome?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosingChange?: (closing: boolean) => void;
}

export function MobileNav({
  lightChrome = false,
  open,
  onOpenChange,
  onClosingChange,
}: MobileNavProps) {
  const toggleRef = useRef<HTMLAnchorElement>(null);
  const closeToggleRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const phaseRef = useRef<MobileMenuPhase>("closed");
  const lastToggleAtRef = useRef(0);
  const tapStartRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const [phase, setPhase] = useState<MobileMenuPhase>("closed");
  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedClient,
    getMountedServer,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  );
  const iconTone = lightChrome ? "bg-white" : "bg-foreground";
  const menuExpanded = phase !== "closed";

  const openMenu = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setPhase("opening");
    onClosingChange?.(false);
    onOpenChange(true);
  }, [onOpenChange, onClosingChange]);

  const closeMenu = useCallback(() => {
    clearMenuHash();
    if (phase === "closed" || phase === "closing") return;
    setPhase("closing");
    onClosingChange?.(true);
  }, [phase, onClosingChange]);

  const requestToggle = useCallback(
    (next: "open" | "close") => {
      const now = Date.now();
      if (now - lastToggleAtRef.current < TOGGLE_DEBOUNCE_MS) return;
      lastToggleAtRef.current = now;
      if (next === "open") {
        openMenu();
        return;
      }
      closeMenu();
    },
    [openMenu, closeMenu],
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* Fallback theo toạ độ: iOS/Safari có lúc không giao click cho nút trong header
     fixed (layer carousel `-webkit-overflow-scrolling`). Listener ở document vẫn
     nhận event nên menu mở được ở mọi browser. */
  useEffect(() => {
    const toggleFromPoint = (x: number, y: number) => {
      /* Lightbox close trùng góc hamburger — không mở menu khi đang khóa header. */
      if (document.documentElement.hasAttribute("data-lightbox-open")) return;
      const closed = phaseRef.current === "closed";
      const target = closed ? toggleRef.current : closeToggleRef.current;
      if (!isPointInsideNode(target, x, y)) return;
      requestToggle(closed ? "open" : "close");
    };

    const onClick = (event: MouseEvent) => {
      /* Bàn phím (Enter/Space) cho toạ độ 0 — để onClick của nút xử lý */
      if (event.clientX === 0 && event.clientY === 0) return;
      toggleFromPoint(event.clientX, event.clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      tapStartRef.current = touch
        ? { x: touch.clientX, y: touch.clientY, at: Date.now() }
        : null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = tapStartRef.current;
      tapStartRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      if (Date.now() - start.at > TAP_DURATION_MAX_MS) return;
      if (Math.abs(touch.clientX - start.x) > TAP_MOVE_MAX_PX) return;
      if (Math.abs(touch.clientY - start.y) > TAP_MOVE_MAX_PX) return;
      toggleFromPoint(touch.clientX, touch.clientY);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", onTouchEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchend", onTouchEnd, true);
    };
  }, [requestToggle]);

  useEffect(() => {
    if (phase === "opening") {
      const openSequenceMs = reducedMotion
        ? 0
        : MENU_OPEN_SEQUENCE_MS;

      const openTimer = window.setTimeout(
        () => setPhase("open"),
        openSequenceMs,
      );
      return () => {
        window.clearTimeout(openTimer);
      };
    }

    if (phase === "closing") {
      const closeSequenceMs = reducedMotion ? 0 : MENU_CLOSE_SEQUENCE_MS;

      const closeTimer = window.setTimeout(() => {
        setPhase("closed");
        onOpenChange(false);
        onClosingChange?.(false);
        clearMenuHash();
      }, closeSequenceMs);
      return () => window.clearTimeout(closeTimer);
    }
  }, [phase, onOpenChange, onClosingChange, reducedMotion]);

  useEffect(() => {
    if (!open && phase !== "closed" && phase !== "closing") {
      setPhase("closed");
      onClosingChange?.(false);
    }
  }, [open, phase, onClosingChange]);

  /* Panel mở được bằng `:target` khi chưa hydrate — hydrate xong thì nhận lại
     trạng thái đó thay vì xoá hash (nếu không menu tự đóng giữa lúc dùng). */
  useEffect(() => {
    if (window.location.hash !== `#${MENU_PANEL_ID}`) {
      clearMenuHash();
      return;
    }
    const frame = window.requestAnimationFrame(() => openMenu());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuExpanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuExpanded]);

  useEffect(() => {
    if (!menuExpanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables: HTMLElement[] = [];
      if (toggleRef.current) focusables.push(toggleRef.current);
      if (panelRef.current) {
        panelRef.current
          .querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          .forEach((element) => focusables.push(element));
      }
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !active || !focusables.includes(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuExpanded, closeMenu]);

  useEffect(() => {
    if (phase !== "open") return;
    closeToggleRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "closed") return;
    const target = previousFocusRef.current;
    previousFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }, [phase]);

  const barClass = (extra: string) =>
    cn(
      "absolute block h-[2px] w-6 rounded-[8px] transition-all duration-300 motion-reduce:transition-none",
      iconTone,
      extra,
    );

  const panel = (
    <div
      ref={panelRef}
      id={MENU_PANEL_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Menu điều hướng"
      data-phase={phase}
      className="mobile-menu-panel"
    >
      <div className="mobile-menu-panel-inner">
        <SiteNavLinks menuPhase={phase} onNavigate={closeMenu} />
      </div>
    </div>
  );

  return (
    <div className="lg:hidden">
      {/* Link hash, không phải button: chưa hydrate (chunk lỗi / mạng chậm)
          thì `#site-mobile-menu:target` vẫn mở được panel. */}
      <a
        ref={toggleRef}
        href={`#${MENU_PANEL_ID}`}
        role="button"
        aria-expanded={menuExpanded}
        aria-controls={MENU_PANEL_ID}
        aria-label="Mở menu"
        className="site-header-menu-toggle site-header-menu-toggle--open relative z-20 flex shrink-0 items-center justify-center"
        onClick={() => requestToggle("open")}
      >
        <span className="sr-only">Mở menu</span>
        <span className={barClass("-translate-y-2")} />
        <span className={barClass("opacity-100")} />
        <span className={barClass("translate-y-2")} />
      </a>
      <a
        ref={closeToggleRef}
        href={`#${MENU_CLOSED_HASH}`}
        role="button"
        aria-expanded={true}
        aria-controls={MENU_PANEL_ID}
        aria-label="Đóng menu"
        className="site-header-menu-toggle site-header-menu-toggle--close relative z-20 shrink-0 items-center justify-center"
        onClick={() => requestToggle("close")}
      >
        <span className="sr-only">Đóng menu</span>
        <span className={barClass("translate-y-0 rotate-45")} />
        <span className={barClass("opacity-0")} />
        <span className={barClass("translate-y-0 -rotate-45")} />
      </a>
      {mounted ? createPortal(panel, document.body) : panel}
    </div>
  );
}
