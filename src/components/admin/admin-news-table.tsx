"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageIcon, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AdminNewsRow {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: string;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function AdminNewsTable({ rows }: { rows: AdminNewsRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const patch = async (
    row: AdminNewsRow,
    body: { published: boolean } | { featured: boolean },
  ) => {
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/news/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("toggle failed");
      router.refresh();
    } catch {
      alert("Không cập nhật được trạng thái. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: AdminNewsRow) => {
    if (!window.confirm(`Xoá bài tin "${row.title}"?`)) return;
    setBusyId(row.id);
    try {
      const response = await fetch(`/api/news/${row.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      router.refresh();
    } catch {
      alert("Không xoá được bài tin. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Chưa có bài tin nào — bấm &quot;Tạo bài tin&quot; để bắt đầu.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Ảnh bìa</TableHead>
            <TableHead>Tiêu đề</TableHead>
            <TableHead className="w-32">Ngày đăng</TableHead>
            <TableHead className="w-32">Trạng thái</TableHead>
            <TableHead className="w-28">Ưu tiên</TableHead>
            <TableHead className="w-40 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <TableRow key={row.id}>
                <TableCell className="py-2">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                    {row.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/news/${row.id}/edit`}
                    className="hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">/tin-tuc/{row.slug}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dateFormat.format(new Date(row.publishedAt))}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patch(row, { published: !row.published })}
                    title="Bấm để đổi trạng thái"
                  >
                    <Badge variant={row.published ? "default" : "secondary"}>
                      {row.published ? "Đang hiện" : "Đang ẩn"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patch(row, { featured: !row.featured })}
                    title="Bấm để bật/tắt ưu tiên"
                    aria-label={row.featured ? "Bỏ ưu tiên" : "Đánh dấu ưu tiên"}
                  >
                    {row.featured ? (
                      <Badge variant="default">Ưu tiên</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {row.published ? (
                      <Link href={`/tin-tuc/${row.slug}`} target="_blank">
                        <Button variant="outline" size="icon" aria-label="Xem trên web">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : null}
                    <Link href={`/admin/news/${row.id}/edit`}>
                      <Button variant="outline" size="icon" aria-label="Sửa">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={busy}
                      onClick={() => remove(row)}
                      aria-label="Xoá"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
