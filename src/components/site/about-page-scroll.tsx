"use client";

import { AboutAwardsSection } from "@/components/site/about-awards-section";
import { AboutHeroSection } from "@/components/site/about-hero-section";
import { AwardsList } from "@/components/site/awards-list";
import { BrandBreakSection } from "@/components/site/brand-break-section";
import { ContentSection } from "@/components/site/content-section";
import { splitAboutBlocks } from "@/lib/about-blocks";
import type {
  AboutPageContent,
  ContactPageContent,
} from "@/lib/validations/site-page";
import type { AboutScrollVariant } from "@/lib/about-variant";

interface AboutPageScrollProps {
  content: AboutPageContent;
  contact?: ContactPageContent;
  /** Biến thể cuộn — xem lib/about-variant.ts (mặc định = hiện tại). */
  variant?: AboutScrollVariant;
}

/**
 * Cuộn bình thường (không còn FullPageScrollRoot/pager) — animation hero +
 * brand-break tự đo theo window scroll (xem use-morph-pin-scroll.ts).
 * Không thêm scroll-snap cho trang này: snap sẽ dừng cuộn giữa chừng và xung
 * đột với animation morph-pin đang chạy liên tục theo vị trí cuộn.
 */
export function AboutPageScroll({
  content,
  contact,
  variant = "pin",
}: AboutPageScrollProps) {
  /* Trước vạch Brand break = trong hero (mờ theo cuộn); sau = cùng khối Đối tác. */
  const { top: topBlocks, bottom: bottomBlocks } = splitAboutBlocks(
    content.blocks,
  );
  return (
    <>
      <AboutHeroSection
        src={content.heroImage}
        alt="Đội ngũ Tetris Design"
      >
        <div className="mx-auto max-w-3xl px-[var(--site-header-pad-inline)]">
          {topBlocks.map((block, index) =>
            block.type === "awards" ? (
              <AboutAwardsSection key={index}>
                <AwardsList
                  title={block.title}
                  groups={block.groups}
                  className="pb-8 pt-2"
                />
              </AboutAwardsSection>
            ) : (
              <ContentSection
                key={index}
                title={block.title}
                paragraphs={block.paragraphs}
                className={index === 0 ? "pb-4 pt-0" : "pb-4 pt-2"}
                bodyClassName="mt-3"
                scrollBlur
              />
            ),
          )}
        </div>
      </AboutHeroSection>
      <BrandBreakSection
        image={content.brandBreakImage}
        imageAlt="Đội ngũ Tetris Design"
        blocks={bottomBlocks}
        partnersTitle={content.partners.title}
        partners={content.partners.items}
        contact={contact}
        variant={variant}
      />
    </>
  );
}
