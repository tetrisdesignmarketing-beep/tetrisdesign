"use client";

import { useEffect, useRef, useState } from "react";
import { ContentSection } from "@/components/site/content-section";
import { PartnersRow } from "@/components/site/partners-row";
import { SiteFooter } from "@/components/site/site-footer";
import type { BrandBreakLogoPhase } from "@/hooks/use-brand-break-scroll";
import type { ContactPageContent } from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

interface ContentPartnerSectionProps {
  journeyTitle: string;
  journeyParagraphs: readonly string[];
  partnersTitle: string;
  partners: readonly { name: string; logo: string; href?: string }[];
  className?: string;
  /** Pager section id — ml2 play khi heading vào view */
  lettersSectionId?: string;
  /** Brand-break logo phase — hiện text khi rest kể cả in-view chậm trên iOS */
  logoPhase?: BrandBreakLogoPhase;
  contact?: ContactPageContent;
}

/** Clip theo inner scroller thôi — không clamp window.innerHeight (iOS URL bar sai). */
function isInScrollerView(el: HTMLElement, minPx: number): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  const scroller = el.closest("[data-fps-inner-scroll]");
  const clip =
    scroller instanceof HTMLElement
      ? scroller.getBoundingClientRect()
      : null;
  const top = Math.max(rect.top, clip?.top ?? Number.NEGATIVE_INFINITY);
  const bottom = Math.min(
    rect.bottom,
    clip?.bottom ?? Number.POSITIVE_INFINITY,
  );
  return bottom - top > minPx;
}

function useContentPartnerReveal(logoPhase?: BrandBreakLogoPhase) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const scroller = el.closest("[data-fps-inner-scroll]");
    let restFallback = 0;

    const tryStart = () => {
      if (isInScrollerView(el, 24)) {
        setVisible(true);
        return true;
      }
      /* Logo rest + đã cuộn một chút: content-shift kéo chữ lên — coi như hiện */
      if (
        logoPhase === "rest" &&
        scroller instanceof HTMLElement &&
        scroller.scrollTop > 24
      ) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (tryStart()) return;

    /* rAF-coalesce: 'scroll' có thể bắn nhiều lần/frame lúc momentum trên iOS —
       tránh gọi getBoundingClientRect (tryStart) không giới hạn tần suất. */
    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        tryStart();
      });
    };

    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", tryStart);
    const observer = new IntersectionObserver(tryStart, { threshold: 0 });
    observer.observe(el);

    /* iOS: in-view đôi khi không fire — sau rest vẫn ép hiện text */
    if (logoPhase === "rest") {
      restFallback = window.setTimeout(() => setVisible(true), 500);
    }

    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", tryStart);
      observer.disconnect();
      window.clearTimeout(restFallback);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }, [visible, logoPhase]);

  return { ref, visible };
}

export function ContentPartnerSection({
  journeyTitle,
  journeyParagraphs,
  partnersTitle,
  partners,
  className,
  lettersSectionId = "about-brand-break",
  logoPhase,
  contact,
}: ContentPartnerSectionProps) {
  const { ref, visible } = useContentPartnerReveal(logoPhase);

  return (
    <div
      ref={ref}
      id="content-partner"
      data-content-partner=""
      data-morph-pin-content=""
      data-content-partner-animate={visible ? "in" : "out"}
      suppressHydrationWarning
      className={cn("relative w-full bg-background", className)}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-start px-[var(--site-header-pad-inline)] pt-6 pb-0 md:pt-8 md:pb-0">
        <ContentSection
          title={journeyTitle}
          paragraphs={journeyParagraphs}
          className="mx-auto w-full max-w-3xl py-4 md:py-6"
          headingEffect="ml2"
          bodyEffect="text-focus-in"
          movingLettersSectionId={lettersSectionId}
          forceLettersPlay={visible}
        />
        <PartnersRow
          title={partnersTitle}
          partners={partners}
          className="mt-6 w-full py-4 pb-0 md:py-6 md:pb-0"
          headingEffect="ml2"
          logoEffect="text-focus-in"
          lettersSectionId={lettersSectionId}
          forceLettersPlay={visible}
        />
        <SiteFooter className="mt-[78px]" contact={contact} />
      </div>
    </div>
  );
}
