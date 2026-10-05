import { NextResponse } from "next/server";
import { revalidateSite } from "@/lib/revalidate-site";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";

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
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch category" },
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
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const slugConflict = await prisma.category.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (slugConflict) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 },
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    revalidateSite();
    return NextResponse.json(category);
  } catch (err) {
    console.error("Update category error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update category";
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
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const postCount = await prisma.post.count({ where: { categoryId: id } });
    if (postCount > 0) {
      return NextResponse.json(
        {
          error: `Không xóa được: còn ${postCount} bài đăng thuộc category này.`,
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });
    revalidateSite();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
