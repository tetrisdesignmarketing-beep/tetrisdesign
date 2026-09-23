import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ProjectDetailContent } from "@/components/site/project-detail-content";
import { ProjectDetailCover } from "@/components/site/project-detail-cover";
import { ProjectDetailImages } from "@/components/site/project-detail-images";
import { ProjectDetailImagesDefault } from "@/components/site/project-detail-images-default";
import { ProjectDetailLayout2Scroll } from "@/components/site/project-detail-layout2-scroll";
import { ProjectShowcase } from "@/components/site/project-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import {
  getPublishedProjectSlugs,
  getRelatedSiteProjects,
  getSiteProjectBySlug,
} from "@/lib/get-site-project";
import { getSiteContact } from "@/lib/get-site-contact";
import { getMediaDimensionsByUrl } from "@/lib/media-dimensions";
import { getProjectCover, getProjectImages } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

/** CMS đổi là thấy ngay — không cache trang chi tiết dự án. */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getPublishedProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getSiteProjectBySlug(slug);
  if (!project) {
    return createPageMetadata({
      title: "Dự án không tồn tại",
      path: `/projects/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${project.slug}`,
    image: getProjectCover(project),
  });
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;
  const [project, contact] = await Promise.all([
    getSiteProjectBySlug(slug),
    getSiteContact(),
  ]);

  if (!project) {
    notFound();
  }

  const images = getProjectImages(project);
  const related = await getRelatedSiteProjects(project);
  const layoutStyle = project.layoutStyle ?? "LAYOUT1";

  if (layoutStyle === "LAYOUT2") {
    return (
      <ProjectDetailLayout2Scroll
        title={project.title}
        concept={project.categoryLabel}
        address={project.location}
        description={project.description ?? ""}
        images={images}
        related={related}
        contact={contact}
      />
    );
  }

  let gallery: ReactNode = null;
  if (images.length > 0) {
    gallery =
      layoutStyle === "LAYOUTDEFAULT" ? (
        <ProjectDetailImagesDefault
          images={images}
          title={project.title}
          /* Kích thước thật từ Media → biết ảnh dọc/ngang ngay từ HTML. */
          dimensions={await getMediaDimensionsByUrl(images)}
        />
      ) : (
        <ProjectDetailImages images={images} title={project.title} />
      );
  }

  const projectDetailContent = project.description ? (
    <ProjectDetailContent
      concept={project.categoryLabel}
      address={project.location}
      description={project.description}
    />
  ) : null;

  return (
    <article data-project-detail>
      {layoutStyle === "LAYOUT1" ? (
        <ProjectDetailCover
          title={project.title}
          src={getProjectCover(project)}
          concept={project.categoryLabel}
          address={project.location}
        />
      ) : null}

      {layoutStyle === "LAYOUTDEFAULT" ? (
        <>
          {project.description ? (
            /* Default: khối tiêu đề cách header 32px, cách lưới ảnh 32px. */
            <ProjectDetailContent
              concept={project.categoryLabel}
              address={project.location}
              description={project.description}
              className="project-detail-content--default py-8"
            />
          ) : null}
          {gallery}
        </>
      ) : (
        <>
          {gallery}
          {projectDetailContent}
        </>
      )}

      <ProjectShowcase projects={related} scrollEffectMode />

      <SiteFooter contact={contact} />
    </article>
  );
}
