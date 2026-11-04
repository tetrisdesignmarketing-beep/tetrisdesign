import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  mapPostToSiteProject,
  postForSiteProjectSelect,
} from "@/lib/map-post-to-site-project";
import {
  getProjectBySlug,
  getRelatedProjects,
  siteProjects,
  type SiteProject,
} from "@/lib/site-content";

/**
 * Chi tiết dự án public: `Post` published theo slug.
 * Không có row published / DB lỗi → `siteProjects` cùng slug.
 */
export const getSiteProjectBySlug = cache(
  async (slug: string): Promise<SiteProject | null> => {
    try {
      const row = await prisma.post.findUnique({
        where: { slug },
        select: {
          ...postForSiteProjectSelect,
          published: true,
        },
      });

      if (row?.published) {
        return mapPostToSiteProject(row);
      }
      if (row && !row.published) {
        return null;
      }
    } catch {
      // giữ hardcode khi không kết nối được DB
    }

    return getProjectBySlug(slug) ?? null;
  },
);

export async function getRelatedSiteProjects(
  project: SiteProject,
  limit = 20,
): Promise<SiteProject[]> {
  try {
    const rows = await prisma.post.findMany({
      where: { published: true, slug: { not: project.slug } },
      // Same order as /projects; the category split below keeps it per group.
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: postForSiteProjectSelect,
    });

    if (rows.length > 0) {
      const mapped = rows.map(mapPostToSiteProject);
      const same = mapped.filter(
        (entry) => entry.category === project.category,
      );
      const rest = mapped.filter(
        (entry) => entry.category !== project.category,
      );
      return [...same, ...rest].slice(0, limit);
    }
  } catch {
    // fallback hardcode
  }

  return getRelatedProjects(project.slug, limit);
}

export async function getPublishedProjectSlugs(): Promise<string[]> {
  try {
    const rows = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true },
      orderBy: { createdAt: "desc" },
    });
    if (rows.length > 0) {
      return rows.map((row) => row.slug);
    }
  } catch {
    // build/dev không có DB
  }

  return siteProjects.map((project) => project.slug);
}
