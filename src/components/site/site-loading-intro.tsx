"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { SiteLoadingRun } from "@/components/site/site-loading-run";
import { restartRouteLoadingAnimations } from "@/lib/site-loading-timing";

const INTRO_DONE_KEY = "site-loading-intro-done";

const subscribeNoop = () => () => {};
function readIntroDone() {
  try {
    return sessionStorage.getItem(INTRO_DONE_KEY) === "1";
  } catch {
    return false; /* private mode */
  }
}

export function SiteLoadingIntro() {
  const [open, setOpen] = useState(true);
  /* Đã xem intro trong phiên → ẩn ngay sau hydrate (server luôn render intro). */
  const introDone = useSyncExternalStore(subscribeNoop, readIntroDone, () => false);
  const hide = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_DONE_KEY, "1");
    } catch {
      /* private mode */
    }
    document.documentElement.setAttribute("data-intro-done", "");
    /* Intro kết thúc đúng lúc 3 khối đã ra hết; nếu loading của route (chờ
       dữ liệu) vẫn còn thì cho nó bắt đầu vòng mới → nối tiếp, không nhảy. */
    restartRouteLoadingAnimations();
    setOpen(false);
  }, []);

  if (!open || introDone) return null;

  return <SiteLoadingRun onDone={hide} intro />;
}
