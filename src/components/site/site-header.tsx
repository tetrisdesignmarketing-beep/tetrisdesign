"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { DesktopNav } from "@/components/site/desktop-nav";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteLogo } from "@/components/site/site-logo";
import { cn } from "@/lib/utils";

const HEADER_OVERLAY_SCROLL_THRESHOLD = 48;

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

function getScrollPastHeaderOverlayThreshold() {
  return window.scrollY > HEADER_OVERLAY_SCROLL_THRESHOLD;
}

function getScrollPastHeaderOverlayThresholdServer() {
  return false;
}

export function SiteHeader() {
  const pathname = usePathname();

  return <SiteHeaderInner key={pathname} pathname={pathname} />;
}

function SiteHeaderInner({ pathname }: { pathname: string }) {
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    getScrollPastHeaderOverlayThreshold,
    getScrollPastHeaderOverlayThresholdServer,
  );

  const overlayCarousel = isHome && !scrolled;
  const menuActive = menuOpen || menuClosing;
  const lightChrome = overlayCarousel && !menuActive;
  const solidHeader = !overlayCarousel || menuActive;

  return (
    <>
      {/* Header `fixed` — trang không có hero cần spacer để nội dung không bị menu che */}
      {isHome ? null : <div aria-hidden className="site-header-spacer" />}
      <header
        data-menu={menuActive ? "open" : "closed"}
        data-home-overlay={lightChrome ? "" : undefined}
        className={cn(
          "site-header pointer-events-auto fixed top-0 w-full motion-reduce:transition-none",
          !lightChrome &&
            "transition-[background-color] duration-300",
          menuActive
            ? "bg-background"
            : solidHeader
              /* Nền đục, không backdrop-blur: blur phía sau header phải vẽ
                 lại mỗi khung hình cuộn — rất tốn trên điện thoại. */
              ? "bg-background"
              : null,
        )}
      >
        <div className="site-header-bar relative z-10">
          <SiteLogo
            inverted={lightChrome}
            prefetch={!isHome}
            className="site-header-logo relative z-10"
          />
          <div className="relative z-10 ml-auto flex items-center">
            <DesktopNav inverted={lightChrome} />
            <MobileNav
              lightChrome={lightChrome}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onClosingChange={setMenuClosing}
            />
          </div>
        </div>
      </header>
    </>
  );
}
