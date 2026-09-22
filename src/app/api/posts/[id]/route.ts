import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { postFeaturedPatchSchema, postSchema } from "@/lib/validations/post";
import { slugSchema } from "@/lib/validations/shared";
import { slugify } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

/** Bật/tắt nhanh "ưu tiên" từ bảng quản lý — không cần gửi lại cả form. */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = postFeaturedPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = await prisma.post.update({
      where: { id },
      data: { featured: parsed.data.featured },
    });

    return NextResponse.json(post);
  } catch (err) {
    console.error("Toggle post featured error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const {
      title,
      slug,
      coverImage,
      images,
      layoutStyle,
      published,
      featured,
      address,
      concept,
      description,
      categoryId,
    } = parsed.data;

    const finalSlug = slug || slugify(title);
    const slugParsed = slugSchema.safeParse(finalSlug);
    if (!slugParsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: {
            fieldErrors: {
              slug: ["Slug không hợp lệ — nhập slug hoặc dùng tiêu đề không dấu"],
            },
          },
        },
        { status: 400 },
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category không tồn tại" },
        { status: 400 },
      );
    }

    const slugConflict = await prisma.post.findFirst({
      where: { slug: slugParsed.data, NOT: { id } },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 },
      );
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        slug: slugParsed.data,
        address,
        concept,
        description,
        categoryId,
        coverImage: coverImage || null,
        images,
        layoutStyle,
        published,
        featured,
      },
    });

    return NextResponse.json(post);
  } catch (err) {
    console.error("Update post error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 },
    );
  }
}
