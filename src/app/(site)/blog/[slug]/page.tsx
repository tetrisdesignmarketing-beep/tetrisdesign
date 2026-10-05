import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/site-metadata";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      select: { title: true, excerpt: true, coverImage: true },
    });

    if (!post) {
      return createPageMetadata({
        title: "Bài viết không tồn tại",
        path: `/blog/${slug}`,
        noIndex: true,
      });
    }

    return createPageMetadata({
      title: post.title,
      description: post.excerpt ?? undefined,
      path: `/blog/${slug}`,
      image: post.coverImage ?? undefined,
    });
  } catch {
    return createPageMetadata({
      title: "Tin tức",
      path: `/blog/${slug}`,
    });
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const post = await prisma.post.findFirst({
    where: { slug, published: true },
  });

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/blog"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-brand-red"
      >
        ← Tin tức
      </Link>

      <header className="mb-8 mt-8">
        <h1 className="text-2xl font-medium uppercase tracking-wide md:text-3xl">
          {post.title}
        </h1>
        <time
          dateTime={post.createdAt.toISOString()}
          className="mt-3 block text-sm text-muted-foreground"
        >
          {new Date(post.createdAt).toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
        {post.excerpt && (
          <p className="mt-4 text-base text-muted-foreground">{post.excerpt}</p>
        )}
      </header>

      {post.coverImage && (
        <div className="relative mb-10 aspect-[2/1] w-full overflow-hidden bg-muted">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            unoptimized
            className="object-cover grayscale"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <MarkdownContent content={post.content ?? ""} />
    </article>
  );
}
