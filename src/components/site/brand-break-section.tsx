"use client";

import { BrandBreakImage } from "@/components/site/brand-break";
import { LogoComponent } from "@/components/site/logo-component";
import { ContentPartnerSection } from "@/components/site/content-partner-section";
import {
  useBrandBreakLogoEnter,
  useBrandBreakScroll,
} from "@/hooks/use-brand-break-scroll";
import type { ContactPageContent } from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

interface BrandBreakSectionProps {
  image: string;
  imageAlt: string;
  journeyTitle: string;
  journeyParagraphs: readonly string[];
  partnersTitle: string;
  partners: readonly { name: string; logo: string; href?: string }[];
  className?: string;
  contact?: ContactPageContent;
}

export function BrandBreakSection({
  image,
  imageAlt,
  journeyTitle,
  journeyParagraphs,
  partnersTitle,
  partners,
  className,
  contact,
}: BrandBreakSectionProps) {
  const rootRef = useBrandBreakScroll();
  const logoPhase = useBrandBreakLogoEnter(rootRef);

  return (
    <div
      ref={rootRef}
      data-morph-pin=""
      data-brand-break=""
      data-brand-break-animate={logoPhase === "waiting" ? "out" : "in"}
      data-brand-break-logo={logoPhase}
      suppressHydrationWarning
      className={cn("relative w-full bg-background", className)}
    >
      <div data-morph-pin-track="">
        <div
          data-morph-pin-pin=""
          className="relative flex min-h-0 w-full flex-col"
        >
          <LogoComponent />
          <BrandBreakImage image={image} imageAlt={imageAlt} />
        </div>
      </div>
      <ContentPartnerSection
        journeyTitle={journeyTitle}
        journeyParagraphs={journeyParagraphs}
        partnersTitle={partnersTitle}
        partners={partners}
        lettersSectionId="about-brand-break"
        logoPhase={logoPhase}
        contact={contact}
      />
    </div>
  );
}
