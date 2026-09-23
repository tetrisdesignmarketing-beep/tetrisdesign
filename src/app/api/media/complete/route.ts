import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMediaTitles } from "@/lib/get-media-titles";
import {
  MAX_IMAGE_STORED_SIZE,
  validateMediaMeta,
} from "@/lib/media";
import {
  MEDIA_TITLE_CONFLICT_ERROR,
  findDuplicateTitleConflicts,
} from "@/lib/media-upload-titles";
import {
  buildStoredPath,
  downloadMediaObject,
  isIncomingPath,
  moveMediaObject,
  removeMediaObjects,
  uploadMediaObject,
} from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";
import { mediaCompleteSchema } from "@/lib/validations/media";

const OPTIMIZABLE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let incomingPath: string | null = null;
  let storedPath: string | null = null;

  try {
    const parsed = mediaCompleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { title, path, filename, mimeType, size } = parsed.data;
    if (!isIncomingPath(path)) {
      return NextResponse.json(
        { error: "Path upload không hợp lệ" },
        { status: 400 },
      );
    }
    incomingPath = path;

    const validation = validateMediaMeta(mimeType, size);
    if (!validation.valid) {
      await removeMediaObjects([path]);
      incomingPath = null;
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const mediaType = validation.type;

    const existingTitles = await getMediaTitles();
    const conflicts = findDuplicateTitleConflicts([title], existingTitles);
    if (conflicts.length > 0) {
      await removeMediaObjects([path]);
      incomingPath = null;
      return NextResponse.json(
        { error: MEDIA_TITLE_CONFLICT_ERROR, conflicts },
        { status: 409 },
      );
    }

    let url: string;
    let finalPath: string;
    let finalFilename: string;
    let finalMime: string;
    let finalSize: number;
    let finalWidth: number | null = null;
    let finalHeight: number | null = null;

    if (OPTIMIZABLE_MIME.has(mimeType)) {
      const { optimizeImageForUpload } = await import("@/lib/optimize-image");
      const originalBuffer = await downloadMediaObject(path);
      const optimized = await optimizeImageForUpload(
        originalBuffer,
        mimeType,
        filename,
      );
      finalWidth = optimized.width ?? null;
      finalHeight = optimized.height ?? null;

      if (
        mediaType === "image" &&
        optimized.buffer.length > MAX_IMAGE_STORED_SIZE
      ) {
        await removeMediaObjects([path]);
        incomingPath = null;
        return NextResponse.json(
          {
            error:
              "Ảnh sau khi nén vẫn vượt 10MB. Hãy giảm kích thước hoặc dùng JPEG/PNG tĩnh.",
          },
          { status: 400 },
        );
      }

      if (optimized.optimized) {
        finalPath = buildStoredPath(optimized.filename);
        storedPath = finalPath;
        url = await uploadMediaObject(
          finalPath,
          optimized.buffer,
          optimized.mimeType,
        );
        await removeMediaObjects([path]);
        incomingPath = null;
        finalFilename = optimized.filename;
        finalMime = optimized.mimeType;
        finalSize = optimized.buffer.length;
      } else {
        finalPath = buildStoredPath(filename);
        storedPath = finalPath;
        url = await moveMediaObject(path, finalPath);
        incomingPath = null;
        finalFilename = filename;
        finalMime = mimeType;
        finalSize = originalBuffer.length;
      }
    } else {
      // SVG / video — không kéo bytes qua Function.
      finalPath = buildStoredPath(filename);
      storedPath = finalPath;
      url = await moveMediaObject(path, finalPath);
      incomingPath = null;
      finalFilename = filename;
      finalMime = mimeType;
      finalSize = size;
    }

    const media = await prisma.media.create({
      data: {
        filename: finalFilename,
        title,
        path: finalPath,
        url,
        mimeType: finalMime,
        size: finalSize,
        type: mediaType,
      },
    });
    const { saveMediaDimensions } = await import("@/lib/media-dimensions");
    await saveMediaDimensions(
      media.id,
      finalWidth ?? undefined,
      finalHeight ?? undefined,
    );

    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    console.error("Complete media upload error:", err);
    const cleanup = [incomingPath, storedPath].filter(
      (p): p is string => Boolean(p),
    );
    if (cleanup.length > 0) {
      try {
        await removeMediaObjects(cleanup);
      } catch (cleanupErr) {
        console.error("Cleanup media objects failed:", cleanupErr);
      }
    }
    const message =
      err instanceof Error ? err.message : "Failed to complete media upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
