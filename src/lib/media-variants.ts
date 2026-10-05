/**
 * Bản thu nhỏ tạo sẵn lúc upload (WebP), lưu cạnh file gốc trong Supabase
 * Storage với tên cố định: `<path-bỏ-đuôi>__w<width>.webp`
 *   vd. `1716000000-nha-hang.webp` → `1716000000-nha-hang__w960.webp`
 * Tên suy ra được từ URL gốc → trình duyệt chọn qua `srcset` mà không cần
 * tra DB, không tốn hạn mức Image Optimization của Vercel.
 *
 * File thuần (không import server) — dùng được ở client, API và script.
 */

/** Chiều rộng bản thu nhỏ (px). Ảnh gốc nhỏ hơn → giữ cỡ gốc (không phóng). */
export const MEDIA_VARIANT_WIDTHS = [480, 960, 1600, 2400] as const;
export type MediaVariantWidth = (typeof MEDIA_VARIANT_WIDTHS)[number];

/** WebP quality cho bản thu nhỏ. */
export const MEDIA_VARIANT_QUALITY = 78;

/** Ảnh mờ siêu nhỏ (LQIP) nhúng thẳng vào HTML: rộng 20px, WebP q50. */
export const MEDIA_PLACEHOLDER_WIDTH = 20;
export const MEDIA_PLACEHOLDER_QUALITY = 50;

/** Bản `src` mặc định khi trình duyệt không hỗ trợ srcset. */
export const MEDIA_VARIANT_FALLBACK_WIDTH: MediaVariantWidth = 1600;

const VARIANT_SUFFIX_RE = /__w\d+\.webp$/i;
/** Chỉ ảnh raster tĩnh mới có bản thu nhỏ (GIF có thể động → bỏ qua). */
const VARIANT_SOURCE_EXT_RE = /\.(jpe?g|png|webp)$/i;
/** URL public của Supabase Storage: <origin>/storage/v1/object/public/<bucket>/<path> */
const PUBLIC_STORAGE_URL_RE =
  /^(https?:\/\/[^/?#]+\/storage\/v1\/object\/public\/[^/?#]+\/)([^?#]+)$/;

/** Đường dẫn object của 1 bản thu nhỏ (trong bucket). */
export function mediaVariantPath(path: string, width: number): string {
  return `${path.replace(/\.[^./]+$/, "")}__w${width}.webp`;
}

/** Path trong bucket có được tạo bản thu nhỏ không. */
export function canHaveMediaVariants(path: string): boolean {
  return VARIANT_SOURCE_EXT_RE.test(path) && !VARIANT_SUFFIX_RE.test(path);
}

function splitStorageUrl(url: string): { prefix: string; path: string } | null {
  const match = PUBLIC_STORAGE_URL_RE.exec(url.trim());
  if (!match) return null;
  const [, prefix, path] = match;
  if (!prefix || !path || !canHaveMediaVariants(path)) return null;
  return { prefix, path };
}

/** URL ảnh (Supabase Storage, raster) có bộ bản thu nhỏ theo quy ước. */
export function hasMediaVariants(url: string): boolean {
  return splitStorageUrl(url) !== null;
}

/** URL bản thu nhỏ; URL không hỗ trợ → trả nguyên URL gốc. */
export function mediaVariantUrl(url: string, width: number): string {
  const parts = splitStorageUrl(url);
  if (!parts) return url;
  return `${parts.prefix}${mediaVariantPath(parts.path, width)}`;
}

/** `srcset` đủ các cỡ; URL không hỗ trợ → undefined. */
export function mediaVariantSrcSet(url: string): string | undefined {
  if (!hasMediaVariants(url)) return undefined;
  return MEDIA_VARIANT_WIDTHS.map(
    (width) => `${mediaVariantUrl(url, width)} ${width}w`,
  ).join(", ");
}

/** Cỡ lớn nhất ≤ `target` (không có → cỡ nhỏ nhất). Dùng cho lớp xem trước. */
export function pickMediaVariantWidthAtMost(target: number): MediaVariantWidth {
  let picked: MediaVariantWidth = MEDIA_VARIANT_WIDTHS[0];
  for (const width of MEDIA_VARIANT_WIDTHS) {
    if (width <= target) picked = width;
  }
  return picked;
}
