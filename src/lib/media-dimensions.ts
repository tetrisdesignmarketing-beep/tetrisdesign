import { prisma } from "@/lib/prisma";

export type MediaDimensions = { width: number; height: number };

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

/**
 * Tra kích thước theo URL ảnh (Post.images lưu đúng Media.url). Lỗi / chưa có
 * cột → map rỗng, component tự đo ở trình duyệt.
 */
export async function getMediaDimensionsByUrl(
  urls: readonly string[],
): Promise<Record<string, MediaDimensions>> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const rows = await prisma.$queryRaw<
      { url: string; width: number | null; height: number | null }[]
    >`SELECT "url", "width", "height" FROM "Media" WHERE "url" = ANY(${unique}) AND "width" IS NOT NULL AND "height" IS NOT NULL`;
    const map: Record<string, MediaDimensions> = {};
    for (const row of rows) {
      if (row.width && row.height) {
        map[row.url] = { width: row.width, height: row.height };
      }
    }
    return map;
  } catch (err) {
    console.warn("[media-dimensions] không đọc được width/height:", err);
    return {};
  }
}
