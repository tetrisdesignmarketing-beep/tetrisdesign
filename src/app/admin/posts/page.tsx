import Link from "next/link";
import { auth } from "@/auth";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPostsTable } from "@/components/admin/admin-posts-table";
import { ADMIN_NAV } from "@/lib/admin-nav";

export default async function AdminPostsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return (
    <>
      <AdminPageHeader
        title="Bài đăng"
        description="Dự án — title, địa chỉ, concept, category"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={ADMIN_NAV.categories.href}>
              <Button variant="outline">
                <Tags className="h-4 w-4" />
                Category
              </Button>
            </Link>
            <Link href="/admin/posts/new">
              <Button>
                <Plus className="h-4 w-4" />
                Tạo bài đăng
              </Button>
            </Link>
          </div>
        }
      />

      <AdminPostsTable />
    </>
  );
}
