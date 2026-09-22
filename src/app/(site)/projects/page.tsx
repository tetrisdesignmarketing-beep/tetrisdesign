import { Suspense } from "react";
import { ProjectFilter } from "@/components/site/project-filter";
import { ProjectsCategoryProvider } from "@/components/site/projects-category-context";
import { ProjectsPageScroll } from "@/components/site/projects-page-scroll";
import { SiteLoadingScreen } from "@/components/site/site-loading-screen";
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

/** CMS bài đăng đổi là thấy ngay — không cache list. */
export const dynamic = "force-dynamic";

/**
 * Fetch TOÀN BỘ dự án (mọi category) đúng 1 lần lúc vào trang.
 * Chuyển tab category sau đó lọc client-side qua `ProjectsCategoryProvider`
 * (xem `projects-category-context.tsx` + `ProjectsPageScroll`) — không gọi
 * lại API, không hiện lại `SiteLoadingScreen`.
 */
async function ProjectsPageData({ contact }: { contact: ContactPageContent }) {
  const projects = await getSiteProjects(null);
  return <ProjectsPageScroll projects={projects} contact={contact} />;
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
