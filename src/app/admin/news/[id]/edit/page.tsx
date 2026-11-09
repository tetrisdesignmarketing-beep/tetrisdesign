import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { NewsForm } from "@/components/admin/news-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { parseNewsContent } from "@/lib/validations/news";

type EditNewsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditNewsPage({ params }: EditNewsPageProps) {
  const { id } = await params;
  const news = await prisma.news.findUnique({ where: { id } }).catch(() => null);
  if (!news) notFound();

  return (
    <>
      <AdminPageHeader
        title="Sửa bài tin"
        description={news.title}
        action={
          <Link href="/admin/news">
            <Button variant="outline">Quay lại</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <NewsForm
            mode="edit"
            initialData={{
              id: news.id,
              title: news.title,
              slug: news.slug,
              description: news.description,
              coverImage: news.coverImage ?? "",
              publishedAt: news.publishedAt.toISOString(),
              published: news.published,
              featured: news.featured,
              externalUrl: news.externalUrl ?? "",
              content: parseNewsContent(news.content),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
