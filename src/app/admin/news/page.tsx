import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminNewsTable,
  type AdminNewsRow,
} from "@/components/admin/admin-news-table";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

async function getRows(): Promise<AdminNewsRow[]> {
  try {
    const rows = await prisma.news.findMany({
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        published: true,
        featured: true,
        publishedAt: true,
      },
      take: 500,
    });
    return rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function AdminNewsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const rows = await getRows();

  return (
    <>
      <AdminPageHeader
        title="Tin tức"
        description="Bài tin trang /tin-tuc — ảnh bìa, tiêu đề, mô tả, nội dung"
        action={
          <Link href="/admin/news/new">
            <Button>
              <Plus className="h-4 w-4" />
              Tạo bài tin
            </Button>
          </Link>
        }
      />
      <AdminNewsTable rows={rows} />
    </>
  );
}
