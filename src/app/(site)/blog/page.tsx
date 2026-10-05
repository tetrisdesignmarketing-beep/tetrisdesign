import Link from "next/link";
import { BlogCoverImage } from "@/components/site/blog-cover-image";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/site-metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = createPageMetadata({
  title: "Tin tức",
  description: "Tin tức và bài viết mới nhất từ Tetris Design.",
  path: "/blog",
});

const postListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  createdAt: true,
} as const;

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function BlogPage() {
  let posts: Awaited<
    ReturnType<
      typeof prisma.post.findMany<{ select: typeof postListSelect }>
    >
  > = [];
  let dbError = false;

  try {
    posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: postListSelect,
    });
  } catch (err) {
    console.error("Blog page DB error:", err);
    dbError = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-medium uppercase tracking-[0.2em]">
          Tin tức
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Các bài viết đã xuất bản
        </p>
      </div>

      {dbError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Không thể tải bài viết. Kiểm tra kết nối database.
        </div>
      )}

      {!dbError && posts.length === 0 && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Chưa có bài viết nào.</p>
        </div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden border-border/60">
            {post.coverImage && (
              <BlogCoverImage
                src={post.coverImage}
                alt={post.title}
                href={`/blog/${post.slug}`}
              />
            )}
            <CardHeader>
              <CardTitle className="text-base font-medium uppercase tracking-wide">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-brand-red"
                >
                  {post.title}
                </Link>
              </CardTitle>
              <CardDescription>
                {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            {post.excerpt && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-3 inline-block text-xs font-medium uppercase tracking-wider hover:text-brand-red"
                >
                  Đọc tiếp →
                </Link>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
