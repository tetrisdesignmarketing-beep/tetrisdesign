import { prisma } from "@/lib/prisma";

export type MediaDimensions = { width: number; height: number };

/** Thông tin phụ của ảnh (theo URL) dùng khi dựng trang. */
export type MediaInfo = {
  width: number | null;
  height: number | null;
  /** Data URI ảnh mờ siêu nhỏ (LQIP). */
  placeholder: string | null;
};

/**
 * Lưu kích thước ảnh vào Media (cột width/height). SQL thô + try/catch: nếu DB
 * chưa có cột (chưa chạy `npm run db:push`) thì bỏ qua, upload vẫn thành công.
 */
export async function saveMediaDimensions(
  id: string,
  width: number | undefined,
  height: number | undefined,
): Promise<void> {
  if (!width || !height) return;
  try {
    await prisma.$executeRaw`UPDATE "Media" SET "width" = ${width}, "height" = ${height} WHERE "id" = ${id}`;
  } catch (err) {
    console.warn("[media-dimensions] không lưu được width/height:", err);
  }
}

/** Lưu ảnh mờ (LQIP). Chưa có cột `placeholder` → bỏ qua. */
export async function saveMediaPlaceholder(
  id: string,
  placeholder: string | null | undefined,
): Promise<void> {
  if (!placeholder) return;
  try {
    await prisma.$executeRaw`UPDATE "Media" SET "placeholder" = ${placeholder} WHERE "id" = ${id}`;
  } catch (err) {
    console.warn("[media-dimensions] không lưu được placeholder:", err);
  }
}

type InfoRow = {
  url: string;
  width: number | null;
  height: number | null;
  placeholder?: string | null;
};

/**
 * Tra kích thước + ảnh mờ theo URL ảnh (Post.images lưu đúng Media.url).
 * DB chưa có cột `placeholder` → chỉ trả kích thước. Lỗi → map rỗng
 * (component tự đo ở trình duyệt, khung dùng màu nền tạm).
 */
export async function getMediaInfoByUrl(
  urls: readonly string[],
): Promise<Record<string, MediaInfo>> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return {};
  let rows: InfoRow[];
  try {
    rows = await prisma.$queryRaw<InfoRow[]>`
      SELECT "url", "width", "height", "placeholder" FROM "Media"
      WHERE "url" = ANY(${unique})`;
  } catch {
    try {
      rows = await prisma.$queryRaw<InfoRow[]>`
        SELECT "url", "width", "height" FROM "Media"
        WHERE "url" = ANY(${unique})`;
    } catch (err) {
      console.warn("[media-dimensions] không đọc được thông tin ảnh:", err);
      return {};
    }
  }
  const map: Record<string, MediaInfo> = {};
  for (const row of rows) {
    map[row.url] = {
      width: row.width && row.width > 0 ? row.width : null,
      height: row.height && row.height > 0 ? row.height : null,
      placeholder: row.placeholder ?? null,
    };
  }
  return map;
}

/** Kích thước theo URL (chỉ ảnh đã có đủ width/height). */
export function toMediaDimensions(
  info: Record<string, MediaInfo>,
): Record<string, MediaDimensions> {
  const map: Record<string, MediaDimensions> = {};
  for (const [url, item] of Object.entries(info)) {
    if (item.width && item.height) {
      map[url] = { width: item.width, height: item.height };
    }
  }
  return map;
}

/** Ảnh mờ theo URL (chỉ ảnh đã có placeholder). */
export function toMediaPlaceholders(
  info: Record<string, MediaInfo>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [url, item] of Object.entries(info)) {
    if (item.placeholder) map[url] = item.placeholder;
  }
  return map;
}

/** Giữ API cũ: chỉ kích thước. */
export async function getMediaDimensionsByUrl(
  urls: readonly string[],
): Promise<Record<string, MediaDimensions>> {
  return toMediaDimensions(await getMediaInfoByUrl(urls));
}

/** Ảnh mờ LQIP theo URL cho danh sách ảnh (1 truy vấn). */
export async function getMediaPlaceholders(
  urls: readonly string[],
): Promise<Record<string, string>> {
  return toMediaPlaceholders(await getMediaInfoByUrl(urls));
}
