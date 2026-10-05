"use client";

import { AboutAwardsSection } from "@/components/site/about-awards-section";
import { AboutHeroSection } from "@/components/site/about-hero-section";
import { AwardsList } from "@/components/site/awards-list";
import { BrandBreakSection } from "@/components/site/brand-break-section";
import { ContentSection } from "@/components/site/content-section";
import type {
  AboutPageContent,
  ContactPageContent,
} from "@/lib/validations/site-page";

interface AboutPageScrollProps {
  content: AboutPageContent;
  contact?: ContactPageContent;
}

/**
 * Cuộn bình thường (không còn FullPageScrollRoot/pager) — animation hero +
 * brand-break tự đo theo window scroll (xem use-morph-pin-scroll.ts).
 * Không thêm scroll-snap cho trang này: snap sẽ dừng cuộn giữa chừng và xung
 * đột với animation morph-pin đang chạy liên tục theo vị trí cuộn.
 */
export function AboutPageScroll({ content, contact }: AboutPageScrollProps) {
  return (
    <>
      <AboutHeroSection src={content.heroImage} alt="Đội ngũ Tetris Design">
        <div className="mx-auto max-w-3xl px-[var(--site-header-pad-inline)]">
          <ContentSection
            title={content.introduction.title}
            paragraphs={content.introduction.paragraphs}
            className="pb-4 pt-0"
            bodyClassName="mt-3"
            scrollBlur
          />
          <AboutAwardsSection>
            <AwardsList
              title={content.awards.title}
              groups={content.awards.groups}
              className="pb-8 pt-2"
            />
          </AboutAwardsSection>
        </div>
      </AboutHeroSection>
      <BrandBreakSection
        image={content.brandBreakImage}
        imageAlt="Đội ngũ Tetris Design"
        journeyTitle={content.journey.title}
        journeyParagraphs={content.journey.paragraphs}
        partnersTitle={content.partners.title}
        partners={content.partners.items}
        contact={contact}
      />
    </>
  );
}
