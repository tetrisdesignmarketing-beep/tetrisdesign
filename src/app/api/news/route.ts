import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseNewsBody } from "@/lib/news-api";
import { prisma } from "@/lib/prisma";
import { revalidateSite } from "@/lib/revalidate-site";

/** Danh sách cho admin (kể cả bài ẩn), mới nhất trước. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const news = await prisma.news.findMany({
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
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => null);
    const result = await parseNewsBody(body);
    if ("error" in result) return result.error;
    const news = await prisma.news.create({ data: result.data });
    revalidateSite();
    return NextResponse.json(news, { status: 201 });
  } catch (err) {
    console.error("Create news error:", err);
    return NextResponse.json({ error: "Không tạo được bài tin" }, { status: 500 });
  }
}
