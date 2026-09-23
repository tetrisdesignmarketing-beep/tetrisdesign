/** Cạnh dài tối đa — giữ UHD/4K long-edge; cắt ảnh điện thoại lớn hơn. */
export const MEDIA_IMAGE_MAX_EDGE = 3840;

/** WebP quality — gần như không khác mắt, giảm mạnh dung lượng. */
export const MEDIA_WEBP_QUALITY = 82;

const RASTER_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export type OptimizedUpload = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  optimized: boolean;
  /** Kích thước ảnh sẽ lưu (đã tính xoay EXIF). Không đọc được → undefined. */
  width?: number;
  height?: number;
};

type SharpFn = (typeof import("sharp"))["default"];

let sharpModulePromise: Promise<SharpFn | null> | null = null;

/** Lazy-load sharp — tránh crash khi native/libvips thiếu trên serverless. */
function loadSharp(): Promise<SharpFn | null> {
  if (!sharpModulePromise) {
    sharpModulePromise = import("sharp")
      .then((mod) => mod.default)
      .catch((err) => {
        console.error("[optimize-image] sharp unavailable, skipping optimize:", err);
        return null;
      });
  }
  return sharpModulePromise;
}

function withWebpExtension(filename: string) {
  const trimmed = filename.trim() || "image";
  const base = trimmed.includes(".")
    ? trimmed.replace(/\.[^.]+$/, "")
    : trimmed;
  return `${base || "image"}.webp`;
}

/**
 * Nén ảnh raster lúc upload: xoay theo EXIF, fit trong 3840px, WebP q82.
 * Bỏ qua SVG, video, GIF/WebP động. Nếu file nén không nhỏ hơn bản gốc
 * (và không cần resize) thì giữ nguyên.
 * Sharp/libvips lỗi load → passthrough (upload vẫn thành công).
 */
export async function optimizeImageForUpload(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<OptimizedUpload> {
  const passthrough: OptimizedUpload = {
    buffer,
    mimeType,
    filename: originalName,
    optimized: false,
  };

  if (!RASTER_MIME.has(mimeType)) {
    return passthrough;
  }

  const sharp = await loadSharp();
  if (!sharp) {
    return passthrough;
  }

  try {
    const meta = await sharp(buffer, { failOn: "none", animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) {
      return passthrough;
    }

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    /* EXIF orientation 5–8 = xoay 90° → trình duyệt hiển thị đổi chiều w/h. */
    const swapped = (meta.orientation ?? 1) >= 5;
    const displayWidth = swapped ? height : width;
    const displayHeight = swapped ? width : height;
    const passthroughWithSize: OptimizedUpload =
      displayWidth > 0 && displayHeight > 0
        ? { ...passthrough, width: displayWidth, height: displayHeight }
        : passthrough;
    const needsResize =
      width > MEDIA_IMAGE_MAX_EDGE || height > MEDIA_IMAGE_MAX_EDGE;

    let pipeline = sharp(buffer, { failOn: "none" }).rotate();
    if (needsResize) {
      pipeline = pipeline.resize({
        width: MEDIA_IMAGE_MAX_EDGE,
        height: MEDIA_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const { data: output, info } = await pipeline
      .webp({ quality: MEDIA_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    if (!needsResize && output.length >= buffer.length) {
      return passthroughWithSize;
    }

    return {
      buffer: output,
      mimeType: "image/webp",
      filename: withWebpExtension(originalName),
      optimized: true,
      width: info.width,
      height: info.height,
    };
  } catch {
    return passthrough;
  }
}
