import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugSchema } from "@/lib/validations/shared";
import { newsSchema } from "@/lib/validations/news";
import { slugifyVietnamese } from "@/lib/utils";

/**
 * Kiểm tra body tạo / sửa bài tin. Trả về dữ liệu ghi DB hoặc NextResponse lỗi.
 * `excludeId` = bài đang sửa (cho phép giữ slug của chính nó).
 */
export async function parseNewsBody(
  body: unknown,
  excludeId?: string,
): Promise<{ data: Prisma.NewsCreateInput } | { error: NextResponse }> {
  const parsed = newsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  const input = parsed.data;
  const slug = slugSchema.safeParse(input.slug || slugifyVietnamese(input.title));
  if (!slug.success) {
    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: {
            fieldErrors: {
              slug: ["Slug không hợp lệ — chỉ chữ thường không dấu, số, dấu gạch ngang"],
            },
          },
        },
        { status: 400 },
      ),
    };
  }
  const conflict = await prisma.news.findFirst({
    where: {
      slug: slug.data,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: { fieldErrors: { slug: ["Slug đã được dùng cho bài khác"] } },
        },
        { status: 409 },
      ),
    };
  }
  return {
    data: {
      title: input.title,
      slug: slug.data,
      description: input.description,
      coverImage: input.coverImage,
      publishedAt: input.publishedAt,
      published: input.published,
      featured: input.featured,
      content: input.content as Prisma.InputJsonValue,
    },
  };
}
