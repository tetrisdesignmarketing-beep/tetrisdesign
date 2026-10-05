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
import { preload } from "react-dom";
import {
  MEDIA_VARIANT_FALLBACK_WIDTH,
  MEDIA_VARIANT_WIDTHS,
  hasMediaVariants,
  mediaVariantSrcSet,
  mediaVariantUrl,
} from "@/lib/media-variants";
import {
  buildRows,
  gallerySizes,
  pairShareOf,
  type GalleryItem,
} from "@/lib/project-gallery-rows";
import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import {
  getMediaInfoByUrl,
  getMediaPlaceholders,
  toMediaDimensions,
  toMediaPlaceholders,
} from "@/lib/media-dimensions";
import { getProjectCover, getProjectImages } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

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
    /* Thẻ meta 1 dòng: gộp xuống dòng của mô tả thành dấu cách. */
    description: project.description?.replace(/\s+/g, " ").trim() || undefined,
    path: `/projects/${project.slug}`,
    image: getProjectCover(project),
  });
}

/**
 * Báo trình duyệt tải ảnh hàng đầu gallery ngay từ <head> (trước khi đọc tới
 * <img> / chạy JS): bản xem trước 480px + srcset lớp nét với đúng `sizes`
 * của component → trình duyệt dùng lại, không tải 2 lần.
 */
function preloadFirstGalleryRow(
  images: string[],
  dimensions: Record<string, { width: number; height: number }>,
) {
  const items: GalleryItem[] = images.map((src, sourceIndex) => {
    const dim = dimensions[src];
    return { src, sourceIndex, ratio: dim ? dim.width / dim.height : null };
  });
  const firstRow = buildRows(items)[0];
  if (!firstRow) return;
  for (const item of firstRow.items) {
    if (!hasMediaVariants(item.src)) continue;
    preload(mediaVariantUrl(item.src, MEDIA_VARIANT_WIDTHS[0]), {
      as: "image",
      fetchPriority: "high",
    });
    preload(mediaVariantUrl(item.src, MEDIA_VARIANT_FALLBACK_WIDTH), {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: mediaVariantSrcSet(item.src),
      imageSizes: gallerySizes(
        firstRow.kind === "pair"
          ? pairShareOf(firstRow.items, item)
          : undefined,
      ),
    });
  }
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
  const layoutStyle = project.layoutStyle ?? "LAYOUT1";
  /* Chạy song song (trước đây nối tiếp: related rồi mới tới kích thước ảnh). */
  const [related, mediaInfo] = await Promise.all([
    getRelatedSiteProjects(project),
    layoutStyle !== "LAYOUT2" && images.length > 0
      ? getMediaInfoByUrl(images)
      : Promise.resolve({}),
  ]);
  /* Kích thước (xếp cặp ảnh dọc) + ảnh mờ LQIP (khung không trống) — có sẵn trong HTML. */
  const dimensions = toMediaDimensions(mediaInfo);
  const placeholders = toMediaPlaceholders(mediaInfo);
  if (layoutStyle === "LAYOUTDEFAULT") {
    preloadFirstGalleryRow(images, dimensions);
  }
  /* Ảnh mờ cho mọi ảnh khác trên trang (bìa LAYOUT1, lightbox, thẻ "Các dự án
     khác") — ProgressiveImage tự lấy qua MediaPlaceholdersProvider. */
  const pagePlaceholders = {
    ...(await getMediaPlaceholders([
      getProjectCover(project),
      ...related.map((item) => item.illustration),
    ])),
    ...placeholders,
  };

  if (layoutStyle === "LAYOUT2") {
    return (
      <MediaPlaceholdersProvider value={pagePlaceholders}>
        <ProjectDetailLayout2Scroll
          title={project.title}
          concept={project.categoryLabel}
          address={project.location}
          description={project.description ?? ""}
          images={images}
          related={related}
          contact={contact}
        />
      </MediaPlaceholdersProvider>
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
          dimensions={dimensions}
          placeholders={placeholders}
        />
      ) : (
        <ProjectDetailImages
          images={images}
          title={project.title}
          placeholders={placeholders}
        />
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
    <MediaPlaceholdersProvider value={pagePlaceholders}>
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
    </MediaPlaceholdersProvider>
  );
}
