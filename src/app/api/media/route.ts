import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMediaTitles } from "@/lib/get-media-titles";
import {
  MEDIA_TITLE_CONFLICT_ERROR,
  findDuplicateTitleConflicts,
} from "@/lib/media-upload-titles";
import { prisma } from "@/lib/prisma";
import { mediaQuerySchema, mediaUploadSchema } from "@/lib/validations/media";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = mediaQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { q, cursor, limit, type } = parsed.data;
    const where = {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { filename: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {},
        type ? { type } : {},
      ],
    };

    const rows = await prisma.media.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err) {
    console.error("Fetch media error:", err);
    return NextResponse.json(
      { error: "Failed to fetch media" },
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
    const formData = await request.formData();
    const file = formData.get("file");
    const titleValue = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const parsedTitle = mediaUploadSchema.safeParse({
      title: typeof titleValue === "string" ? titleValue : "",
    });
    if (!parsedTitle.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsedTitle.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { validateMediaFile, sanitizeFilename, MAX_IMAGE_STORED_SIZE } =
      await import("@/lib/media");
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const existingTitles = await getMediaTitles();
    const conflicts = findDuplicateTitleConflicts(
      [parsedTitle.data.title],
      existingTitles,
    );
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: MEDIA_TITLE_CONFLICT_ERROR, conflicts },
        { status: 409 },
      );
    }

    const { createSupabaseAdmin, getPublicUrl, getStorageBucket } =
      await import("@/lib/supabase");
    const { optimizeImageForUpload } = await import("@/lib/optimize-image");

    const supabase = createSupabaseAdmin();
    const bucket = getStorageBucket();
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageForUpload(
      originalBuffer,
      file.type,
      file.name,
    );
    if (
      validation.type === "image" &&
      optimized.buffer.length > MAX_IMAGE_STORED_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Ảnh sau khi nén vẫn vượt 10MB. Hãy giảm kích thước hoặc dùng JPEG/PNG tĩnh.",
        },
        { status: 400 },
      );
    }
    const safeName = sanitizeFilename(optimized.filename);
    const path = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, optimized.buffer, {
        contentType: optimized.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Upload failed" },
        { status: 500 },
      );
    }

    const url = getPublicUrl(path);
    const media = await prisma.media.create({
      data: {
        filename: optimized.filename,
        title: parsedTitle.data.title,
        path,
        url,
        mimeType: optimized.mimeType,
        size: optimized.buffer.length,
        type: validation.type,
      },
    });
    const { saveMediaDimensions } = await import("@/lib/media-dimensions");
    await saveMediaDimensions(media.id, optimized.width, optimized.height);

    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
