import { NextResponse } from "next/server";
import { revalidateSite } from "@/lib/revalidate-site";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isSitePageSlug,
  parseSitePageContent,
} from "@/lib/validations/site-page";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { error: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { slug } = await context.params;
  if (!isSitePageSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  try {
    const page = await prisma.sitePage.findUnique({ where: { slug } });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch site page" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { slug } = await context.params;
  if (!isSitePageSlug(slug)) {
    return NextResponse.json({ error: "Invalid page slug" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = parseSitePageContent(slug, body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const content = parsed.data as Prisma.InputJsonValue;
    const page = await prisma.sitePage.upsert({
      where: { slug },
      create: { slug, content },
      update: { content },
    });

    revalidateSite();
    return NextResponse.json(page);
  } catch (err) {
    console.error("Update site page error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update site page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
