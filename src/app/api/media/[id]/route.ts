import { NextResponse } from "next/server";
import { revalidateSite } from "@/lib/revalidate-site";
import { auth } from "@/auth";
import { getMediaTitles } from "@/lib/get-media-titles";
import {
  MEDIA_TITLE_CONFLICT_ERROR,
  findDuplicateTitleConflicts,
} from "@/lib/media-upload-titles";
import { prisma } from "@/lib/prisma";
import { mediaUploadSchema } from "@/lib/validations/media";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = mediaUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existingTitles = await getMediaTitles(id);
    const conflicts = findDuplicateTitleConflicts(
      [parsed.data.title],
      existingTitles,
    );
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: MEDIA_TITLE_CONFLICT_ERROR, conflicts },
        { status: 409 },
      );
    }

    const media = await prisma.media.update({
      where: { id },
      data: { title: parsed.data.title },
    });
    revalidateSite();
    return NextResponse.json(media);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update media";
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
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const { createSupabaseAdmin, getStorageBucket } = await import(
      "@/lib/supabase"
    );
    const supabase = createSupabaseAdmin();
    const bucket = getStorageBucket();

    const { mediaVariantPaths } = await import("@/lib/media-storage");
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([media.path, ...mediaVariantPaths(media.path)]);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete file" },
        { status: 500 },
      );
    }

    await prisma.media.delete({ where: { id } });
    revalidateSite();
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
