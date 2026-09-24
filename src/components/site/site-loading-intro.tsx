"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteLoadingRun } from "@/components/site/site-loading-run";
import { restartRouteLoadingAnimations } from "@/lib/site-loading-timing";

const INTRO_DONE_KEY = "site-loading-intro-done";

export function SiteLoadingIntro() {
  const [open, setOpen] = useState(true);
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

  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_DONE_KEY) === "1") setOpen(false);
    } catch {
      /* private mode */
    }
  }, []);

  if (!open) return null;

  return <SiteLoadingRun onDone={hide} intro />;
}
