"use client";

import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { useSectionEnterOnce } from "@/hooks/use-section-enter-once";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { ContactPageContent } from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

interface ServiceSectionProps {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
  /** Full viewport panel inside virtual pager (Services page) */
  fullPage?: boolean;
  /** Preview của màn đầu — không đặt priority lên mọi panel. */
  priority?: boolean;
  sectionId: string;
  className?: string;
  /** Màn cuối — footer dưới block + min-height copy */
  showFooter?: boolean;
  contact?: ContactPageContent;
}

/** Không để opacity:0 mãi nếu enter-once / animation kẹt (hay gặp trên phone). */
const PLAY_FAILSAFE_MS = 1200;
/** Khớp `focus-in-expand` — lớp nét chỉ gắn sau khi enter xong. */
const ENTER_SETTLE_MS = 800;

function shouldSkipEnterAnimation(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 767px)").matches
  );
}

export function ServiceSection({
  title,
  description,
  image,
  imageAlt,
  reverse = false,
  fullPage = false,
  priority = false,
  sectionId,
  className,
  showFooter = false,
  contact,
}: ServiceSectionProps) {
  const entered = useSectionEnterOnce(sectionId);
  const [play, setPlay] = useState(false);
  const [enterSettled, setEnterSettled] = useState(false);

  useEffect(() => {
    if (play) return;

    if (shouldSkipEnterAnimation()) {
      setPlay(true);
      return;
    }

    const failsafe = window.setTimeout(() => setPlay(true), PLAY_FAILSAFE_MS);

    if (entered !== "in") {
      return () => window.clearTimeout(failsafe);
    }

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPlay(true));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(failsafe);
    };
  }, [entered, play]);

  useEffect(() => {
    if (!play) return;
    if (shouldSkipEnterAnimation()) {
      setEnterSettled(true);
      return;
    }
    const id = window.setTimeout(() => setEnterSettled(true), ENTER_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [play]);

  return (
    <section
      data-services-last={showFooter ? "" : undefined}
      className={cn(
        fullPage
          ? "flex min-h-full w-full flex-col justify-start bg-background"
          : "py-8 md:py-12",
        className,
      )}
    >
      <div
        data-focus-in-expand={play ? "in" : "out"}
        data-services-last-main={showFooter ? "" : undefined}
        className={cn(
          "mx-auto w-full max-w-6xl px-[28px]",
          fullPage
            ? "flex flex-1 flex-col justify-start gap-[32px] pt-[38px] md:grid md:grid-cols-2 md:items-center md:gap-12"
            : "grid items-center gap-8 md:grid-cols-2 md:gap-12",
          reverse && "md:[&>*:first-child]:order-2",
        )}
      >
        <div
          data-service-media=""
          className="relative aspect-[4/3] w-full overflow-hidden"
        >
          <ProgressiveImage
            src={image}
            alt={imageAlt}
            previewWidth={CANVAS_PREVIEW_WIDTH}
            fullWidth={CANVAS_FULL_WIDTH}
            loadFull={enterSettled}
            fade={false}
            priority={priority}
            className="object-cover grayscale"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div data-service-copy="">
          <h2
            data-service-title=""
            className="site-label-text uppercase"
          >
            {title}
          </h2>
          <p className="mt-[8px] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {showFooter ? (
        <SiteFooter
          className="mt-[var(--services-footer-gap)]"
          contact={contact}
        />
      ) : null}
    </section>
  );
}
