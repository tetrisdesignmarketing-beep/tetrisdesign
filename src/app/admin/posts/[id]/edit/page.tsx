import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/post-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EditPostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    prisma.post.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <>
      <AdminPageHeader
        title="Chỉnh sửa bài đăng"
        description={post.title}
        action={
          <Link href="/admin/posts">
            <Button variant="outline">Quay lại</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <PostForm
            mode="edit"
            categories={categories}
            initialData={{
              id: post.id,
              title: post.title,
              slug: post.slug,
              address: post.address,
              concept: post.concept,
              categoryId: post.categoryId ?? "",
              description: post.description,
              coverImage: post.coverImage ?? "",
              images: post.images,
              layoutStyle: post.layoutStyle,
              published: post.published,
              featured: post.featured,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
