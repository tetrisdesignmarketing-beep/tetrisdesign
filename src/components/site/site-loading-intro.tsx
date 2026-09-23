"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteLoadingRun } from "@/components/site/site-loading-run";

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
