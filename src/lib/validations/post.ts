import { z } from "zod";
import {
  mediaPathSchema,
  optionalMediaPathSchema,
} from "@/lib/validations/shared";

const optionalSlugSchema = z
  .string()
  .max(200, "Slug tối đa 200 ký tự")
  .refine(
    (val) => val === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val),
    "Slug chỉ được chứa chữ thường, số và dấu gạch ngang",
  );

/** Khớp Prisma `PostLayoutStyle`. LAYOUT2 = Infinite Canvas (R3F). */
export const postLayoutStyleSchema = z.enum([
  "LAYOUTDEFAULT",
  "LAYOUT1",
  "LAYOUT2",
]);

export type PostLayoutStyle = z.infer<typeof postLayoutStyleSchema>;

export const postSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(200, "Tiêu đề tối đa 200 ký tự"),
  slug: optionalSlugSchema,
  address: z
    .string()
    .min(1, "Địa chỉ không được để trống")
    .max(200, "Địa chỉ tối đa 200 ký tự"),
  concept: z
    .string()
    .min(1, "Concept không được để trống")
    .max(100, "Concept tối đa 100 ký tự"),
  categoryId: z.string().min(1, "Chọn category"),
  description: z.string().min(1, "Mô tả không được để trống"),
  coverImage: optionalMediaPathSchema,
  /** Không dùng `.default([])` — lệch input/output làm `zodResolver` + RHF lỗi type. */
  images: z.array(mediaPathSchema),
  layoutStyle: postLayoutStyleSchema,
  published: z.boolean(),
  // Ưu tiên hiển thị đầu trang chủ — xem getHomeProjects.
  featured: z.boolean(),
});

export type PostFormValues = z.infer<typeof postSchema>;

export const POST_PAGE_SIZE = 20;

/** Query `GET /api/posts` — cuộn vô hạn theo cursor, giống `mediaQuerySchema`. */
export const postQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(POST_PAGE_SIZE),
  /** "true" = chỉ trả bài ưu tiên; thiếu = không lọc. */
  featured: z.literal("true").optional(),
  /** Tìm theo tiêu đề (contains, không phân biệt hoa/thường). */
  q: z.string().trim().min(1).max(200).optional(),
});

export type PostQueryValues = z.infer<typeof postQuerySchema>;

/** Body `PATCH /api/posts/reorder` — id các bài đang tải, theo thứ tự mới sau khi kéo thả. */
export const postReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});

export type PostReorderValues = z.infer<typeof postReorderSchema>;

/** Body `PATCH /api/posts/[id]` — bật/tắt nhanh ưu tiên từ bảng quản lý. */
export const postFeaturedPatchSchema = z.object({
  featured: z.boolean(),
});

export type PostFeaturedPatchValues = z.infer<typeof postFeaturedPatchSchema>;
