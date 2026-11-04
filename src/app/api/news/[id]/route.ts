import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseNewsBody } from "@/lib/news-api";
import { prisma } from "@/lib/prisma";
import { revalidateSite } from "@/lib/revalidate-site";
import { newsPublishedPatchSchema } from "@/lib/validations/news";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireUser() {
  const session = await auth();
  return session?.user
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireUser();
  if (denied) return denied;
  const { id } = await context.params;
  const news = await prisma.news.findUnique({ where: { id } }).catch(() => null);
  if (!news) {
    return NextResponse.json({ error: "News not found" }, { status: 404 });
  }
  return NextResponse.json(news);
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireUser();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const existing = await prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => null);
    const result = await parseNewsBody(body, id);
    if ("error" in result) return result.error;
    const news = await prisma.news.update({ where: { id }, data: result.data });
    revalidateSite();
    return NextResponse.json(news);
  } catch (err) {
    console.error("Update news error:", err);
    return NextResponse.json({ error: "Không lưu được bài tin" }, { status: 500 });
  }
}

/** Bật / tắt hiển thị nhanh từ bảng quản lý. */
export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireUser();
  if (denied) return denied;
  const { id } = await context.params;
  const parsed = newsPublishedPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const news = await prisma.news.update({
      where: { id },
      data: parsed.data,
      select: { id: true, published: true, featured: true },
    });
    revalidateSite();
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({ error: "Không cập nhật được" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireUser();
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await prisma.news.delete({ where: { id } });
    revalidateSite();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Không xoá được bài tin" }, { status: 500 });
  }
}
