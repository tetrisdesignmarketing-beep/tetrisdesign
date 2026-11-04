import { z } from "zod";
import { mediaPathSchema } from "@/lib/validations/shared";

/**
 * Nội dung bài tin = danh sách khối, hiển thị đúng thứ tự:
 * - text: tài liệu TipTap (JSON) — chỉ các node/mark trong NEWS_TEXT_* được
 *   hiển thị (xem components/site/news-content.tsx), phần lạ bị bỏ qua.
 * - image: ảnh từ Media, độ rộng % (điện thoại luôn 100%), căn lề, chú thích.
 */
export const NEWS_IMAGE_ALIGNS = ["left", "center", "right"] as const;
export type NewsImageAlign = (typeof NEWS_IMAGE_ALIGNS)[number];

export const NEWS_IMAGE_MIN_WIDTH = 25;
export const NEWS_IMAGE_MAX_WIDTH = 100;

/** Node TipTap — kiểm tra lỏng (đệ quy), renderer chỉ nhận loại đã biết. */
export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

const tipTapNodeSchema: z.ZodType<TipTapNode> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(tipTapNodeSchema).max(2000).optional(),
    marks: z
      .array(
        z.object({
          type: z.string().max(40),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .max(20)
      .optional(),
    text: z.string().max(20000).optional(),
  }),
);

export const tipTapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(tipTapNodeSchema).max(2000).optional(),
});
export type TipTapDoc = z.infer<typeof tipTapDocSchema>;

const blockIdSchema = z.string().min(1).max(64);

export const newsTextBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("text"),
  doc: tipTapDocSchema,
});

export const newsImageBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("image"),
  src: mediaPathSchema,
  alt: z.string().max(300),
  caption: z.string().max(500),
  width: z
    .number()
    .int()
    .min(NEWS_IMAGE_MIN_WIDTH)
    .max(NEWS_IMAGE_MAX_WIDTH),
  align: z.enum(NEWS_IMAGE_ALIGNS),
});

export const newsBlockSchema = z.discriminatedUnion("type", [
  newsTextBlockSchema,
  newsImageBlockSchema,
]);
export type NewsBlock = z.infer<typeof newsBlockSchema>;
export type NewsTextBlock = z.infer<typeof newsTextBlockSchema>;
export type NewsImageBlock = z.infer<typeof newsImageBlockSchema>;

export const newsContentSchema = z.array(newsBlockSchema).max(200);

/** Đọc JSON từ DB: hỏng / sai cấu trúc → bỏ khối lỗi thay vì cả bài trống. */
export function parseNewsContent(raw: unknown): NewsBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: NewsBlock[] = [];
  for (const item of raw) {
    const parsed = newsBlockSchema.safeParse(item);
    if (parsed.success) blocks.push(parsed.data);
  }
  return blocks;
}

export const NEWS_DESCRIPTION_MAX = 400;

/** Body PUT/POST /api/news. */
export const newsSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(300),
  /** Trống → tự sinh từ tiêu đề (bỏ dấu tiếng Việt). */
  slug: z.string().trim().max(200),
  description: z
    .string()
    .trim()
    .min(1, "Mô tả không được để trống")
    .max(NEWS_DESCRIPTION_MAX, `Mô tả tối đa ${NEWS_DESCRIPTION_MAX} ký tự`),
  coverImage: mediaPathSchema,
  /** yyyy-mm-dd (ô ngày của form) hoặc ISO. */
  publishedAt: z.coerce.date({ error: "Ngày đăng không hợp lệ" }),
  published: z.boolean(),
  featured: z.boolean().default(false),
  content: newsContentSchema,
});
export type NewsInput = z.infer<typeof newsSchema>;

/** PATCH nhanh từ bảng admin: bật/tắt hiển thị hoặc ưu tiên. */
export const newsPublishedPatchSchema = z
  .object({ published: z.boolean().optional(), featured: z.boolean().optional() })
  .refine((value) => value.published !== undefined || value.featured !== undefined, {
    message: "Thiếu published hoặc featured",
  });

/** Số bài mỗi trang /tin-tuc (lưới 3 cột × 3 hàng). */
export const NEWS_PAGE_SIZE = 9;
