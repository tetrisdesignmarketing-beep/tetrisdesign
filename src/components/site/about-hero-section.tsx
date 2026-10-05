"use client";

import type { ReactNode } from "react";
import { AboutHero } from "@/components/site/about-hero";
import { AboutIntroSection } from "@/components/site/about-intro-section";
import { useMorphPinScroll } from "@/hooks/use-morph-pin-scroll";
import { cn } from "@/lib/utils";

interface AboutHeroSectionProps {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
}

export function AboutHeroSection({
  src,
  alt,
  children,
  className,
}: AboutHeroSectionProps) {
  const rootRef = useMorphPinScroll("about-hero");

  return (
    <div
      ref={rootRef}
      data-morph-pin=""
      data-about-hero-morph=""
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
