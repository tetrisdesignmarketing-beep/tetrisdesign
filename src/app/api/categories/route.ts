import { NextResponse } from "next/server";
import { revalidateSite } from "@/lib/revalidate-site";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: parsed.data,
    });
    revalidateSite();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("Create category error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
