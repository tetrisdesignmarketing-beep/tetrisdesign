import { prisma } from "@/lib/prisma";
import { mapPostToSiteProject, postCoverSrc } from "@/lib/map-post-to-site-project";
import { pickBalancedLatest } from "@/lib/pick-balanced-latest";
import {
  getHomeProjects as getHardcodedHomeProjects,
  type SiteProject,
} from "@/lib/site-content";

export const HOME_PROJECTS_LIMIT = 9;

/**
 * Lưới dự án trang chủ.
 * Ưu tiên 1: bài đánh dấu `featured` lên đầu — theo thứ tự admin kéo thả
 * (`sortOrder`), KHÔNG chia đều category (admin toàn quyền chọn bài nào nổi
 * bật nhất). Ưu tiên 2: phần còn thiếu (nếu `featured` chưa đủ `limit`) lấy
 * từ các bài thường, chia đều category (round-robin) như trước.
 * Luôn đảm bảo đủ `limit` bài nếu có đủ dữ liệu. DB lỗi / chưa có bài →
 * hardcode `siteProjects`.
 */
export async function getHomeProjects(
  limit = HOME_PROJECTS_LIMIT,
): Promise<SiteProject[]> {
  try {
    const [categories, posts] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      }),
      prisma.post.findMany({
        where: { published: true },
        // Thứ tự admin kéo thả ở /admin/posts — createdAt chỉ còn là tiebreak
        // ngầm định (Postgres không đảm bảo thứ tự khi sortOrder trùng, nhưng
        // với dữ liệu portfolio nhỏ, không phải mối lo).
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          title: true,
          address: true,
          concept: true,
          description: true,
          coverImage: true,
          images: true,
          categoryId: true,
          featured: true,
          category: { select: { slug: true, name: true } },
        },
      }),
    ]);

    const visible = posts.filter((post) => postCoverSrc(post));
    if (visible.length === 0) {
      return getHardcodedHomeProjects(limit);
    }

    const featuredVisible = visible.filter((post) => post.featured);
    const restVisible = visible.filter((post) => !post.featured);

    // Bài ưu tiên: lấy tối đa `limit` bài đầu theo sortOrder, không chia
    // category — `visible` đã orderBy sortOrder asc nên slice giữ đúng thứ tự.
    const pickedFeatured = featuredVisible.slice(0, limit);

    // Phần còn thiếu: lấy bài thường, chia đều category như cũ.
    const remaining = limit - pickedFeatured.length;
    const keyOrder = [
      ...categories.map((category) => category.id),
      "",
    ];
    const pickedRest =
      remaining > 0
        ? pickBalancedLatest(
            restVisible,
            remaining,
            (post) => post.categoryId ?? "",
            keyOrder,
          )
        : [];

    return [...pickedFeatured, ...pickedRest].map(mapPostToSiteProject);
  } catch {
    return getHardcodedHomeProjects(limit);
  }
}
