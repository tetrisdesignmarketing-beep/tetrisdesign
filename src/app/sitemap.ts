import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublishedProjectSlugs } from "@/lib/get-site-project";
import { siteUrl } from "@/lib/site-metadata";

const staticPaths = [
  "",
  "/about",
  "/projects",
  "/services",
  "/contact",
  "/blog",
];

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  const projectSlugs = await getPublishedProjectSlugs();
  const projectEntries: MetadataRoute.Sitemap = projectSlugs.map((slug) => ({
    url: `${siteUrl}/projects/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogEntries = posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable during build — static sitemap still valid
  }

  return [...staticEntries, ...projectEntries, ...blogEntries];
}
