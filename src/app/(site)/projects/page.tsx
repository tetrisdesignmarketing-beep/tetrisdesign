import { Suspense } from "react";
import { ProjectFilter } from "@/components/site/project-filter";
import { ProjectsCategoryProvider } from "@/components/site/projects-category-context";
import { ProjectsPageScroll } from "@/components/site/projects-page-scroll";
import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { SiteLoadingScreen } from "@/components/site/site-loading-screen";
import { getMediaPlaceholders } from "@/lib/media-dimensions";
import { getSiteContact } from "@/lib/get-site-contact";
import { getSiteProjects } from "@/lib/get-site-projects";
import { createPageMetadata } from "@/lib/site-metadata";
import type { ContactPageContent } from "@/lib/validations/site-page";

export const metadata = createPageMetadata({
  title: "Dự án",
  description:
    "Portfolio dự án kiến trúc và nội thất — nhà hàng, showroom, lưu trú bởi Tetris Design.",
  path: "/projects",
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

/**
 * Fetch TOÀN BỘ dự án (mọi category) đúng 1 lần lúc vào trang.
 * Chuyển tab category sau đó lọc client-side qua `ProjectsCategoryProvider`
 * (xem `projects-category-context.tsx` + `ProjectsPageScroll`) — không gọi
 * lại API, không hiện lại `SiteLoadingScreen`.
 */
async function ProjectsPageData({ contact }: { contact: ContactPageContent }) {
  const projects = await getSiteProjects(null);
  /* Ảnh mờ LQIP cho ảnh bìa thẻ dự án (hiện đúng vùng ảnh, không phủ lề). */
  const placeholders = await getMediaPlaceholders(
    projects.map((project) => project.illustration),
  );
  return (
    <MediaPlaceholdersProvider value={placeholders}>
      <ProjectsPageScroll projects={projects} contact={contact} />
    </MediaPlaceholdersProvider>
  );
}

export default async function ProjectsPage() {
  const contact = await getSiteContact();

  return (
    <Suspense fallback={null}>
      <ProjectsCategoryProvider>
        <div data-projects-page="" className="bg-background">
          <Suspense
            fallback={
              <div className="h-[52px] shrink-0 md:h-[60px]" />
            }
          >
            <ProjectFilter stickTo="header" />
          </Suspense>
          <Suspense fallback={<SiteLoadingScreen autoDismiss />}>
            <ProjectsPageData contact={contact} />
          </Suspense>
        </div>
      </ProjectsCategoryProvider>
    </Suspense>
  );
}
