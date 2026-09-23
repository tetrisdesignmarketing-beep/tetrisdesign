"use client";

import { useEffect, useRef } from "react";
import { SiteLoadingScreen } from "@/components/site/site-loading-screen";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { subscribeSiteViewportHeight } from "@/lib/home-scroll";
import {
  readSiteLoadingDismissMs,
  readSiteLoadingIntroMs,
} from "@/lib/site-loading-timing";

const AUTODISMISS_ANIMATION = "site-loading-autodismiss";

interface SiteLoadingRunProps {
  onDone: () => void;
  /** Intro / `show()` — tự ẩn theo token. Route nav: `false` (chờ data rồi delay dismiss). */
  dismissOnTimer?: boolean;
  /** Intro mở web — ẩn khi CSS kết thúc đúng 1 vòng (`--sl-intro-ms`). */
  intro?: boolean;
}

export function SiteLoadingRun({
  onDone,
  dismissOnTimer = true,
  intro = false,
}: SiteLoadingRunProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => subscribeSiteViewportHeight(), []);

  useEffect(() => {
    if (!dismissOnTimer) return;

    if (reducedMotion) {
      onDone();
      return;
    }

    const root = rootRef.current;

    if (intro && root) {
      /* Unmount theo chính animation tự ẩn của CSS (cùng đồng hồ với các khối
         logo) thay vì timer JS đếm từ lúc hydrate — không lệch với hình. Nếu
         React hydrate muộn và CSS đã ẩn xong → gỡ luôn. */
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        onDone();
      };
      const anim =
        typeof root.getAnimations === "function"
          ? root
              .getAnimations()
              .find(
                (a) =>
                  "animationName" in a &&
                  (a as CSSAnimation).animationName === AUTODISMISS_ANIMATION,
              )
          : undefined;
      if (anim?.playState === "finished") {
        finish();
        return;
      }
      anim?.finished.then(finish).catch(() => {});
      /* Lưới an toàn: trình duyệt không có getAnimations / animation bị huỷ. */
      const fallback = window.setTimeout(
        finish,
        readSiteLoadingIntroMs(root) + 500,
      );
      return () => {
        done = true;
        window.clearTimeout(fallback);
      };
    }

    const dismissMs = readSiteLoadingDismissMs(root);
    const id = window.setTimeout(onDone, dismissMs);

    return () => window.clearTimeout(id);
  }, [onDone, reducedMotion, dismissOnTimer, intro]);

  return (
    <SiteLoadingScreen
      rootRef={rootRef}
      autoDismiss={dismissOnTimer && !reducedMotion}
      intro={intro}
    />
  );
}
