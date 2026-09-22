import { prisma } from "@/lib/prisma";
import {
  mapPostToSiteProject,
  postCoverSrc,
  postForSiteProjectSelect,
} from "@/lib/map-post-to-site-project";
import {
  getProjectsByCategory,
  type ProjectCategory,
  type SiteProject,
} from "@/lib/site-content";

/**
 * Lưới `/projects`: mọi `Post` published (có cover).
 * Default = toàn bộ, không dùng picker 8 bài `getHomeProjects`.
 * `?category=` = lọc theo slug category (tab).
 */
export async function getSiteProjects(
  category: ProjectCategory | null = null,
): Promise<SiteProject[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        ...(category ? { category: { slug: category } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: postForSiteProjectSelect,
    });

    return posts.filter((post) => postCoverSrc(post)).map(mapPostToSiteProject);
  } catch {
    return getProjectsByCategory(category);
  }
}
