"use client";

import { ProjectDetailContent } from "@/components/site/project-detail-content";
import { ProjectDetailImagesDefault } from "@/components/site/project-detail-images-default";
import { ProjectDetailImagesLayout2 } from "@/components/site/project-detail-images-layout2";
import { ProjectShowcase } from "@/components/site/project-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import {
  FullPageScrollRoot,
  type FullPageScrollSection,
} from "@/components/site/full-page-scroll";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { PROJECT_DETAIL_LAYOUT2_SECTIONS } from "@/lib/project-detail-layout2-section-config";
import type { ProjectFact, SiteProject } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ProjectDetailLayout2ScrollProps {
  title: string;
  concept: string;
  address: string;
  facts: ProjectFact[];
  description: string;
  images: string[];
  related: SiteProject[];
  contact: ContactPageContent;
}

export function ProjectDetailLayout2Scroll({
  title,
  concept,
  address,
  facts,
  description,
  images,
  related,
  contact,
}: ProjectDetailLayout2ScrollProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <article data-project-detail>
        {images.length > 0 ? (
          <ProjectDetailImagesDefault images={images} title={title} />
        ) : null}
        {description ? (
          <ProjectDetailContent
            concept={concept}
            address={address}
            facts={facts}
            description={description}
          />
        ) : null}
        <ProjectShowcase projects={related} scrollEffectMode />
        <SiteFooter contact={contact} />
      </article>
    );
  }

  const panels: FullPageScrollSection[] = [
    {
      def: PROJECT_DETAIL_LAYOUT2_SECTIONS[0]!,
      "aria-label": "Ảnh dự án",
      children: <ProjectDetailImagesLayout2 images={images} title={title} />,
    },
    {
      def: PROJECT_DETAIL_LAYOUT2_SECTIONS[1]!,
      "aria-label": "Mô tả và dự án liên quan",
      children: (
        <>
          {description ? (
            <ProjectDetailContent
              concept={concept}
              address={address}
              facts={facts}
              description={description}
            />
          ) : null}
          <ProjectShowcase projects={related} scrollEffectMode />
          <SiteFooter className="mt-auto" contact={contact} />
        </>
      ),
    },
  ];

  return (
    <div data-project-detail-layout2="">
      <FullPageScrollRoot
        effect="slide"
        sections={PROJECT_DETAIL_LAYOUT2_SECTIONS}
        panels={panels}
      />
    </div>
  );
}
