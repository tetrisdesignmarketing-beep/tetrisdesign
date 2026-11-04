import { prisma } from "@/lib/prisma";
import {
  NEWS_PAGE_SIZE,
  parseNewsContent,
  type NewsBlock,
} from "@/lib/validations/news";

export interface NewsListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  publishedAt: Date;
}

export interface NewsDetail extends NewsListItem {
  content: NewsBlock[];
  updatedAt: Date;
}

const listSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  coverImage: true,
  publishedAt: true,
} as const;

/** Ngày hiển thị kiểu thiết kế "5/10/2026" — theo giờ Việt Nam. */
export function formatNewsDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

/** Trang danh sách /tin-tuc (chỉ bài đang hiện), mới nhất trước. DB lỗi → rỗng. */
export async function getNewsPage(page: number): Promise<{
  items: NewsListItem[];
  page: number;
  totalPages: number;
}> {
  try {
    const where = { published: true };
    const total = await prisma.news.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), totalPages);
    const items = await prisma.news.findMany({
      where,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (current - 1) * NEWS_PAGE_SIZE,
      take: NEWS_PAGE_SIZE,
      select: listSelect,
    });
    return { items, page: current, totalPages };
  } catch {
    return { items: [], page: 1, totalPages: 1 };
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsDetail | null> {
  try {
    const row = await prisma.news.findFirst({
      where: { slug, published: true },
      select: { ...listSelect, content: true, updatedAt: true },
    });
    if (!row) return null;
    return { ...row, content: parseNewsContent(row.content) };
  } catch {
    return null;
  }
}

/** "Tin khác" cuối bài: bài mới nhất trừ bài đang xem. */
export async function getOtherNews(
  excludeId: string,
  take = 3,
): Promise<NewsListItem[]> {
  try {
    return await prisma.news.findMany({
      where: { published: true, NOT: { id: excludeId } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: listSelect,
    });
  } catch {
    return [];
  }
}

export async function getPublishedNewsSlugs(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  try {
    return await prisma.news.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    return [];
  }
}
