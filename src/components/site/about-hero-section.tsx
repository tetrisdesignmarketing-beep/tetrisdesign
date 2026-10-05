"use client";

import type { CSSProperties, ReactNode } from "react";
import { AboutHero } from "@/components/site/about-hero";
import { AboutIntroSection } from "@/components/site/about-intro-section";
import { useMorphPinScroll } from "@/hooks/use-morph-pin-scroll";
import type { AboutScrollVariant } from "@/lib/about-variant";
import { cn } from "@/lib/utils";

interface AboutHeroSectionProps {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
  variant?: AboutScrollVariant;
  /** Tỷ lệ rộng/cao ảnh (nếu biết) — dùng cho khung ảnh khi không ghim (A). */
  imageRatio?: number;
}

export function AboutHeroSection({
  src,
  alt,
  children,
  className,
  variant = "pin",
  imageRatio,
}: AboutHeroSectionProps) {
  const flowMobile = variant === "flow-mobile";
  const rootRef = useMorphPinScroll("about-hero", { flowOnMobile: flowMobile });

  return (
    <div
      ref={rootRef}
      data-morph-pin=""
      data-about-hero-morph=""
      data-morph-pin-flow-mobile={flowMobile ? "" : undefined}
      style={
        flowMobile && imageRatio
          ? ({ "--about-flow-ratio": String(imageRatio) } as CSSProperties)
          : undefined
      }
      suppressHydrationWarning
      className={cn("relative w-full bg-background", className)}
    >
      <div data-morph-pin-track="">
        <div
          data-morph-pin-pin=""
          className="relative flex min-h-0 w-full flex-col"
        >
          <AboutHero src={src} alt={alt} />
        </div>
      </div>
      <AboutIntroSection>{children}</AboutIntroSection>
    </div>
  );
}
