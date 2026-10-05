/**
 * Sinh favicon/app icon từ public/icon.svg (logo Tetris nền đỏ thương hiệu).
 * Chạy lại khi đổi logo: `node scripts/generate-icons.mjs`
 * - src/app/favicon.ico  (16/32/48 — Google ưu tiên /favicon.ico, bội số 48px)
 * - src/app/apple-icon.png (180, nền đặc — iOS tự bo góc)
 * - src/app/icon1.png (192 — bản nét cho Google Search)
 * - public/icon-192.png, public/icon-512.png (manifest / Android)
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/icon.svg", "utf8");
/* Apple icon: bỏ bo góc (góc trong suốt hiện thành màu đen trên iOS). */
const squareSvg = svg.replace(/\srx="[^"]*"\s+ry="[^"]*"/, "");

const png = (source, size) =>
  sharp(Buffer.from(source), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** ICO chứa ảnh PNG (hỗ trợ từ Windows Vista, mọi trình duyệt & Google). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/* 48 đứng đầu: Next đọc kích thước ảnh đầu tiên để ghi `sizes` cho
   <link rel="icon"> — Google khuyến nghị favicon ≥ 48px. */
const icoSizes = [48, 32, 16];
const icoImages = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(svg, size) })),
);
await writeFile("src/app/favicon.ico", buildIco(icoImages));
await writeFile("src/app/apple-icon.png", await png(squareSvg, 180));
/* PNG lớn cho Google Search / trình duyệt chọn bản nét (link rel=icon 192x192). */
await writeFile("src/app/icon1.png", await png(svg, 192));
await writeFile("public/icon-192.png", await png(svg, 192));
await writeFile("public/icon-512.png", await png(svg, 512));
console.log("Đã tạo favicon.ico, apple-icon.png, icon-192.png, icon-512.png");
