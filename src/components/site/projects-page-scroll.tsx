"use client";

import { useMemo } from "react";
import { ProjectShowcase } from "@/components/site/project-showcase";
import { useProjectsCategory } from "@/components/site/projects-category-context";
import { SiteFooter } from "@/components/site/site-footer";
import type { SiteProject } from "@/lib/site-content";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ProjectsPageScrollProps {
  projects: SiteProject[];
  contact?: ContactPageContent;
}

/**
 * `/projects` — cuộn document thật. Tab category nằm ngoài Suspense (iOS).
 * `projects` = TOÀN BỘ dự án (fetch 1 lần ở `page.tsx`) — lọc theo category
 * ở đây (client, tức thì), không gọi lại API khi đổi tab.
 */
export function ProjectsPageScroll({
  projects,
  contact,
}: ProjectsPageScrollProps) {
  const { category } = useProjectsCategory();

  const filtered = useMemo(
    () =>
      category ? projects.filter((project) => project.category === category) : projects,
    [projects, category],
  );

  return (
    <>
      <ProjectShowcase projects={filtered} infinite />
      <SiteFooter className="mt-[var(--projects-footer-gap)]" contact={contact} />
    </>
  );
}
