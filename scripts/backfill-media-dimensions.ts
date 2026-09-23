/**
 * Bổ sung width/height cho ảnh đã upload trước khi có 2 cột này.
 * Chạy 1 lần, SAU `npm run db:push`:
 *   npm run media:backfill-dimensions
 * An toàn khi chạy lại: chỉ xử lý ảnh còn thiếu kích thước.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();

type Row = { id: string; url: string; mimeType: string };

async function readDimensions(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("không đọc được kích thước");
  /* EXIF orientation 5–8: hiển thị xoay 90° → đổi chiều. */
  const swapped = (meta.orientation ?? 1) >= 5;
  return swapped ? { width: height, height: width } : { width, height };
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(url, base).toString();
}

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "id", "url", "mimeType" FROM "Media"
    WHERE "type" = 'image' AND ("width" IS NULL OR "height" IS NULL)
    ORDER BY "createdAt" DESC`;

  console.log(`Cần bổ sung kích thước: ${rows.length} ảnh`);
  let done = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { width, height } = await readDimensions(absoluteUrl(row.url));
      await prisma.$executeRaw`UPDATE "Media" SET "width" = ${width}, "height" = ${height} WHERE "id" = ${row.id}`;
      done += 1;
      console.log(`✓ ${width}×${height}  ${row.url}`);
    } catch (err) {
      failed += 1;
      console.warn(`✗ ${row.url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`Xong: ${done} thành công, ${failed} lỗi.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
