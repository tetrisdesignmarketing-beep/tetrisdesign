import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug có xử lý tiếng Việt: bỏ dấu (NFD) + đ → d, rồi như `slugify`.
 * "Trải nghiệm văn hoá Thái" → "trai-nghiem-van-hoa-thai".
 */
export function slugifyVietnamese(text: string): string {
  return slugify(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D"),
  );
}
