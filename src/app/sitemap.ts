import type { MetadataRoute } from "next";
import { getPublishedProjectSlugs } from "@/lib/get-site-project";
import { getPublishedNewsSlugs } from "@/lib/get-site-news";
import { siteUrl } from "@/lib/site-metadata";

const staticPaths = [
  "",
  "/about",
  "/projects",
  "/services",
  "/contact",
  "/tin-tuc",
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

  const newsEntries: MetadataRoute.Sitemap = (
    await getPublishedNewsSlugs()
  ).map((news) => ({
    url: `${siteUrl}/tin-tuc/${news.slug}`,
    lastModified: news.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...projectEntries, ...newsEntries];
}
