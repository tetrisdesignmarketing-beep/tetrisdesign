"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { SiteLoadingRun } from "@/components/site/site-loading-run";
import {
  msUntilLoopEnd,
  readSiteLoadingDismissMs,
} from "@/lib/site-loading-timing";

export type NavigateWithLoadingOptions = {
  /** Mặc định `true`. Category tabs: `false`. */
  scroll?: boolean;
};

interface SiteLoadingContextValue {
  show: () => void;
  /**
   * Loading trước → paint → rồi `router.push`.
   * Ẩn khi URL đích khớp và `main` không còn `[data-site-loading]` (Suspense / loading.tsx xong),
   * rồi chờ `--sl-dismiss-ms` (0.5s) trước khi unmount overlay.
   */
  navigateWithLoading: (
    href: string,
    options?: NavigateWithLoadingOptions,
  ) => void;
}

const SiteLoadingContext = createContext<SiteLoadingContextValue>({
  show: () => {},
  navigateWithLoading: () => {},
});

type LoadingMode = "timer" | "route";

function locationMatchesHref(href: string): boolean {
  const target = new URL(href, window.location.origin);
  if (target.pathname !== window.location.pathname) return false;
  const targetQuery = target.searchParams.toString();
  const currentQuery = new URLSearchParams(window.location.search).toString();
  return targetQuery === currentQuery;
}

/** pathname + query hiện tại — mốc để biết đã rời trang cũ chưa. */
function currentLocationKey(): string {
  const query = new URLSearchParams(window.location.search).toString();
  return `${window.location.pathname}?${query}`;
}

/**
 * Đã chuyển trang xong: URL khớp link đích, HOẶC đã rời trang cũ (URL khác lúc
 * bấm). Vế sau xử lý redirect (/posts → /blog), dấu "/" cuối… — trước đây so
 * khớp chính xác nên kẹt loading tới failsafe 15s đè lên trang đã tải xong.
 */
function navigationArrived(pending: PendingNavigation): boolean {
  return (
    locationMatchesHref(pending.href) || currentLocationKey() !== pending.from
  );
}

type PendingNavigation = { href: string; from: string };

const ROUTE_LOADING_FAILSAFE_MS = 8_000;
/** Mờ dần khi tắt overlay — khớp `--sl-fade-ms` trong globals.css. */
const OVERLAY_FADE_MS = 250;

function overlayRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-site-loading-overlay]");
}

export function SiteLoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<LoadingMode>("timer");
  const pendingHrefRef = useRef<PendingNavigation | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const dismissScheduledRef = useRef(false);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const hideNow = useCallback(() => {
    clearDismissTimer();
    dismissScheduledRef.current = false;
    pendingHrefRef.current = null;
    setOpen(false);
    setMode("timer");
  }, [clearDismissTimer]);

  /**
   * Route ready / failsafe: chờ HẾT VÒNG animation hiện tại (3 khối đã trượt
   * ra — không cắt giữa chừng; lần đầu = tối thiểu trọn 1 vòng kể từ lúc hiện),
   * rồi mờ dần overlay và unmount. Không đọc được animation (reduced motion…)
   * → chờ `--sl-dismiss-ms` như cũ.
   */
  const hideAfterDismissDelay = useCallback(() => {
    if (dismissScheduledRef.current) return;
    dismissScheduledRef.current = true;
    clearDismissTimer();
    const root = overlayRoot();
    const waitMs = msUntilLoopEnd(root) ?? readSiteLoadingDismissMs(root);
    dismissTimerRef.current = window.setTimeout(() => {
      const current = overlayRoot();
      if (!current) {
        hideNow();
        return;
      }
      current.setAttribute("data-site-loading-leaving", "");
      dismissTimerRef.current = window.setTimeout(hideNow, OVERLAY_FADE_MS);
    }, waitMs);
  }, [clearDismissTimer, hideNow]);

  const show = useCallback(() => {
    clearDismissTimer();
    dismissScheduledRef.current = false;
    pendingHrefRef.current = null;
    setMode("timer");
    setOpen(true);
  }, [clearDismissTimer]);

  const navigateWithLoading = useCallback(
    (href: string, options?: NavigateWithLoadingOptions) => {
      if (typeof window === "undefined") return;
      if (locationMatchesHref(href)) return;

      const scroll = options?.scroll ?? true;
      clearDismissTimer();
      dismissScheduledRef.current = false;
      pendingHrefRef.current = { href, from: currentLocationKey() };
      /* Bấm link khác lúc overlay đang mờ dần → hiện lại ngay. */
      overlayRoot()?.removeAttribute("data-site-loading-leaving");

      flushSync(() => {
        setMode("route");
        setOpen(true);
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          router.push(href, { scroll });
        });
      });
    },
    [router, clearDismissTimer],
  );

  useEffect(() => {
    if (!open || mode !== "route") return;

    let raf = 0;
    let finished = false;
    const failsafe = window.setTimeout(() => {
      finished = true;
      hideAfterDismissDelay();
    }, ROUTE_LOADING_FAILSAFE_MS);

    const tick = () => {
      if (finished || dismissScheduledRef.current) return;

      const pending = pendingHrefRef.current;
      if (!pending) {
        finished = true;
        hideAfterDismissDelay();
        return;
      }

      if (navigationArrived(pending)) {
        const busy = document.querySelector("main [data-site-loading]");
        if (!busy) {
          finished = true;
          hideAfterDismissDelay();
          return;
        }
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
  }, [open, mode, hideAfterDismissDelay]);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  const value = useMemo(
    () => ({ show, navigateWithLoading }),
    [show, navigateWithLoading],
  );

  return (
    <SiteLoadingContext.Provider value={value}>
      {open ? (
        <SiteLoadingRun
          onDone={hideNow}
          dismissOnTimer={mode === "timer"}
          overlay
        />
      ) : null}
      {children}
    </SiteLoadingContext.Provider>
  );
}

export function useSiteLoading() {
  return useContext(SiteLoadingContext);
}
