import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { postQuerySchema, postSchema } from "@/lib/validations/post";
import { slugSchema } from "@/lib/validations/shared";
import { slugify } from "@/lib/utils";

async function resolvePostSlug(title: string, slug: string) {
  const finalSlug = slug || slugify(title);
  const parsed = slugSchema.safeParse(finalSlug);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: {
            fieldErrors: {
              slug: ["Slug không hợp lệ — nhập slug hoặc dùng tiêu đề không dấu"],
            },
          },
        },
        { status: 400 },
      ),
    };
  }
  return { slug: parsed.data };
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Category không tồn tại" },
      { status: 400 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = postQuerySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    featured: searchParams.get("featured") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { cursor, limit, featured, q } = parsed.data;

  try {
    const rows = await prisma.post.findMany({
      where: {
        AND: [
          featured === "true" ? { featured: true } : {},
          q ? { title: { contains: q, mode: "insensitive" as const } } : {},
        ],
      },
      // id tiebreak: thứ tự luôn xác định (kể cả nhiều bài cùng sortOrder) — cursor ổn định.
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        address: true,
        concept: true,
        published: true,
        featured: true,
        sortOrder: true,
        category: { select: { name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err) {
    console.error("Fetch posts error:", err);
    return NextResponse.json(
      {
        error:
          "Không kết nối được database. Kiểm tra DATABASE_URL trong file .env và chạy npm run db:push.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
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

    const resolved = await resolvePostSlug(title, slug);
    if ("error" in resolved) return resolved.error;

    const categoryError = await assertCategory(categoryId);
    if (categoryError) return categoryError;

    const existing = await prisma.post.findUnique({
      where: { slug: resolved.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 },
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug: resolved.slug,
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

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error("Create post error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
