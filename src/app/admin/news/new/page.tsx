import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { NewsForm } from "@/components/admin/news-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NewNewsPage() {
  return (
    <>
      <AdminPageHeader
        title="Tạo bài tin"
        description="Ảnh bìa + tiêu đề + mô tả hiện ở trang danh sách; nội dung gồm đoạn văn và ảnh"
        action={
          <Link href="/admin/news">
            <Button variant="outline">Quay lại</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <NewsForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}
