/**
 * Tạo bản thu nhỏ (srcset) cho ảnh đã upload TRƯỚC khi có tính năng này.
 * Upload mới đã tự tạo (xem `storeMediaVariants`).
 *   npm run media:backfill-variants            # bỏ qua ảnh đã có bản thu nhỏ
 *   npm run media:backfill-variants -- --force # tạo lại tất cả
 * Cần trong .env: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY (và SUPABASE_STORAGE_BUCKET nếu khác "media").
 * Kèm theo: điền width/height còn thiếu (giống media:backfill-dimensions) và
 * ảnh mờ LQIP (cột `placeholder` — cần `npm run db:push` trước). Ảnh đã có bản
 * thu nhỏ mà thiếu ảnh mờ → chỉ tải bản 480px (nhẹ) để tạo ảnh mờ.
 * An toàn khi chạy lại.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  MEDIA_PLACEHOLDER_QUALITY,
  MEDIA_PLACEHOLDER_WIDTH,
  MEDIA_VARIANT_QUALITY,
  MEDIA_VARIANT_WIDTHS,
  canHaveMediaVariants,
  mediaVariantPath,
} from "../src/lib/media-variants";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");
/** Số ảnh xử lý song song (mạng tới Supabase là phần chậm nhất). */
const CONCURRENCY = 3;
/** Thử lại khi lỗi mạng tạm thời ("fetch failed", reset, timeout…). */
const RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRIES) await sleep(1000 * attempt * attempt);
    }
  }
  throw new Error(
    `${label}: ${lastError instanceof Error ? lastError.message : String(lastError)} (sau ${RETRIES} lần thử)`,
  );
}

type Row = {
  id: string;
  path: string;
  url: string;
  width: number | null;
  height: number | null;
  placeholder: string | null;
};

async function makePlaceholder(buffer: Buffer) {
  const output = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: MEDIA_PLACEHOLDER_WIDTH })
    .webp({ quality: MEDIA_PLACEHOLDER_QUALITY })
    .toBuffer();
  return `data:image/webp;base64,${output.toString("base64")}`;
}

async function savePlaceholder(id: string, placeholder: string) {
  await prisma.$executeRaw`UPDATE "Media" SET "placeholder" = ${placeholder} WHERE "id" = ${id}`;
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name} trong .env`);
  return value;
}

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
const supabase = createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

function publicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/** Đã có đủ bản thu nhỏ (kiểm tra bản nhỏ nhất + lớn nhất). */
async function hasVariants(path: string) {
  const widths = [MEDIA_VARIANT_WIDTHS[0], MEDIA_VARIANT_WIDTHS.at(-1)!];
  for (const width of widths) {
    const res = await withRetry("kiểm tra", () =>
      fetch(publicUrl(mediaVariantPath(path, width)), { method: "HEAD" }),
    );
    if (!res.ok) return false;
  }
  return true;
}

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "id", "path", "url", "width", "height", "placeholder" FROM "Media"
    WHERE "type" = 'image'
    ORDER BY "createdAt" DESC`;
  const targets = rows.filter((row) => canHaveMediaVariants(row.path));
  console.log(
    `Ảnh raster: ${targets.length}/${rows.length}${force ? " (--force)" : ""}`,
  );

  let created = 0;
  let placeholdersOnly = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;
  const total = targets.length;
  const progress = () => `[${String(done).padStart(String(total).length)}/${total}]`;

  async function processRow(row: Row) {
    const needsPlaceholder = force || !row.placeholder;
    const variantsOk = !force && (await hasVariants(row.path));
    if (variantsOk && !needsPlaceholder) {
      skipped += 1;
      return "skip" as const;
    }
    if (variantsOk) {
      /* Đã có bản thu nhỏ, chỉ thiếu ảnh mờ → tải bản 480px thay vì file gốc. */
      const small = await withRetry("tải bản 480", async () => {
        const res = await fetch(
          publicUrl(mediaVariantPath(row.path, MEDIA_VARIANT_WIDTHS[0])),
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      });
      await savePlaceholder(row.id, await makePlaceholder(small));
      placeholdersOnly += 1;
      return "placeholder" as const;
    }
    const buffer = await withRetry("tải ảnh gốc", async () => {
      const { data, error } = await supabase.storage.from(bucket).download(row.path);
      if (error || !data) throw new Error(error?.message ?? "download lỗi");
      return Buffer.from(await data.arrayBuffer());
    });

    const meta = await sharp(buffer, { failOn: "none", animated: true }).metadata();
    if ((meta.pages ?? 1) > 1) {
      skipped += 1;
      return "animated" as const;
    }

    for (const width of MEDIA_VARIANT_WIDTHS) {
      const output = await sharp(buffer, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: MEDIA_VARIANT_QUALITY })
        .toBuffer();
      await withRetry(`upload ${width}w`, async () => {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(mediaVariantPath(row.path, width), output, {
            contentType: "image/webp",
            cacheControl: "31536000",
            upsert: true,
          });
        if (uploadError) throw new Error(uploadError.message);
      });
    }

    await savePlaceholder(row.id, await makePlaceholder(buffer));

    if (!row.width || !row.height) {
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      const swapped = (meta.orientation ?? 1) >= 5;
      if (w && h) {
        await prisma.$executeRaw`UPDATE "Media" SET "width" = ${swapped ? h : w}, "height" = ${swapped ? w : h} WHERE "id" = ${row.id}`;
      }
    }
    created += 1;
    return "created" as const;
  }

  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const row = targets[cursor++]!;
      try {
        const result = await processRow(row);
        done += 1;
        if (result === "created") console.log(`${progress()} ✓ ${row.path}`);
        else if (result === "placeholder") console.log(`${progress()} ◌ ảnh mờ  ${row.path}`);
        else if (result === "animated") console.log(`${progress()} – ảnh động, bỏ qua  ${row.path}`);
        else if (done % 25 === 0 || done === total) {
          /* Ảnh đã có bản thu nhỏ: chỉ báo tiến độ định kỳ để biết script vẫn chạy. */
          console.log(`${progress()} … đã kiểm tra (bỏ qua ảnh đã có bản thu nhỏ: ${skipped})`);
        }
      } catch (err) {
        done += 1;
        failed += 1;
        console.warn(`${progress()} ✗ ${row.path}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(
    `Xong: ${created} tạo mới, ${placeholdersOnly} thêm ảnh mờ, ${skipped} bỏ qua, ${failed} lỗi.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
