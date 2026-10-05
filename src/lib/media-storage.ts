import {
  createSupabaseAdmin,
  getPublicUrl,
  getStorageBucket,
} from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/media";
import {
  MEDIA_VARIANT_WIDTHS,
  canHaveMediaVariants,
  mediaVariantPath,
} from "@/lib/media-variants";

/** Temp objects uploaded by the browser before server finalize. */
export const MEDIA_INCOMING_PREFIX = "incoming/";

const INCOMING_PATH_RE = /^incoming\/[a-z0-9][a-z0-9._\-]*$/;

export function buildIncomingPath(originalFilename: string) {
  const safe = sanitizeFilename(originalFilename) || "file";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${MEDIA_INCOMING_PREFIX}${Date.now()}-${id}-${safe}`;
}

export function isIncomingPath(path: string) {
  return (
    path.startsWith(MEDIA_INCOMING_PREFIX) &&
    path.length <= 400 &&
    !path.includes("..") &&
    INCOMING_PATH_RE.test(path)
  );
}

export function buildStoredPath(filename: string) {
  const safe = sanitizeFilename(filename) || "file";
  return `${Date.now()}-${safe}`;
}

export async function createSignedMediaUpload(path: string) {
  const supabase = createSupabaseAdmin();
  const bucket = getStorageBucket();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message || "Failed to create signed upload URL");
  }

  return {
    bucket,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function downloadMediaObject(path: string) {
  const supabase = createSupabaseAdmin();
  const bucket = getStorageBucket();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(error?.message || "Failed to download uploaded file");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadMediaObject(
  path: string,
  buffer: Buffer,
  contentType: string,
) {
  const supabase = createSupabaseAdmin();
  const bucket = getStorageBucket();
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(error.message || "Failed to store optimized file");
  }
  return getPublicUrl(path);
}

export async function moveMediaObject(fromPath: string, toPath: string) {
  const supabase = createSupabaseAdmin();
  const bucket = getStorageBucket();
  const { error } = await supabase.storage.from(bucket).move(fromPath, toPath);
  if (error) {
    throw new Error(error.message || "Failed to move uploaded file");
  }
  return getPublicUrl(toPath);
}

export async function removeMediaObjects(paths: string[]) {
  if (paths.length === 0) return;
  const supabase = createSupabaseAdmin();
  const bucket = getStorageBucket();
  await supabase.storage.from(bucket).remove(paths);
}

/**
 * Tạo + lưu bản thu nhỏ cạnh file gốc (tên cố định, xem media-variants.ts).
 * Không bao giờ ném lỗi: thiếu bản thu nhỏ thì site tự rơi về ảnh gốc.
 * @returns số bản đã lưu
 */
export async function storeMediaVariants(
  path: string,
  buffer: Buffer,
): Promise<number> {
  if (!canHaveMediaVariants(path)) return 0;
  try {
    const { generateMediaVariants } = await import("@/lib/optimize-image");
    const variants = await generateMediaVariants(buffer);
    if (variants.length === 0) return 0;
    const supabase = createSupabaseAdmin();
    const bucket = getStorageBucket();
    let stored = 0;
    for (const variant of variants) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(mediaVariantPath(path, variant.width), variant.buffer, {
          contentType: "image/webp",
          /* Tên có timestamp của file gốc → nội dung không đổi → cache lâu. */
          cacheControl: "31536000",
          upsert: true,
        });
      if (error) {
        console.error("Store media variant failed:", path, variant.width, error);
      } else {
        stored += 1;
      }
    }
    return stored;
  } catch (err) {
    console.error("Store media variants failed:", path, err);
    return 0;
  }
}

/** Đường dẫn mọi bản thu nhỏ của 1 file (để xoá kèm file gốc). */
export function mediaVariantPaths(path: string): string[] {
  if (!canHaveMediaVariants(path)) return [];
  return MEDIA_VARIANT_WIDTHS.map((width) => mediaVariantPath(path, width));
}
