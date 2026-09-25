import { normalizePartnerHref } from "@/lib/partner-href";
import { siteSocial } from "@/lib/site-content";

/** Thứ tự cố định — cũng là thứ tự icon trên footer. */
export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "behance",
  "zalo",
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type SocialLinks = Record<SocialKey, string>;

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  behance: "Behance",
  zalo: "Zalo",
};

/** Chuỗi trông như số điện thoại (cho phép +, khoảng trắng, chấm, gạch, ngoặc). */
const PHONE_LIKE = /^\+?[\d\s.\-()]+$/;

/**
 * Zalo: admin nhập số điện thoại → `https://zalo.me/<số>` (bỏ ký tự phân cách
 * và dấu +, vd. "+84 969 873 396" → zalo.me/84969873396, "0969 873 396" →
 * zalo.me/0969873396); hoặc dán link đầy đủ → chuẩn hoá như link thường.
 */
function normalizeZaloHref(raw: string): string {
  if (PHONE_LIKE.test(raw)) {
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15
      ? `https://zalo.me/${digits}`
      : "";
  }
  return normalizePartnerHref(raw);
}

/**
 * Chuẩn hoá link mạng xã hội. Trống → "" (ẩn icon). Thiếu scheme → thêm
 * `https://`. Chỉ nhận http/https (giá trị đi thẳng vào `href`), sai → "".
 */
export function normalizeSocialHref(
  key: SocialKey,
  raw: string | null | undefined,
): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  return key === "zalo" ? normalizeZaloHref(value) : normalizePartnerHref(value);
}

/** Hợp lệ khi để trống hoặc chuẩn hoá được. */
export function isValidSocialHref(
  key: SocialKey,
  raw: string | null | undefined,
): boolean {
  const value = raw?.trim() ?? "";
  return value === "" || normalizeSocialHref(key, value) !== "";
}

/** Link mặc định (code) — dùng khi CMS Liên hệ chưa từng lưu mục mạng xã hội. */
export function getFallbackSocialLinks(): SocialLinks {
  return {
    facebook: siteSocial.facebook,
    instagram: siteSocial.instagram,
    tiktok: siteSocial.tiktok,
    behance: siteSocial.behance ?? "",
    zalo: "",
  };
}

/**
 * Link hiển thị trên site từ CMS Liên hệ.
 * - Chưa có `social` (dữ liệu cũ / DB lỗi) → link mặc định trong code.
 * - Đã lưu → đúng theo admin; ô trống = ẩn icon.
 */
export function resolveSocialLinks(contact?: {
  social?: Partial<Record<SocialKey, string>>;
}): SocialLinks {
  const social = contact?.social;
  if (!social) return getFallbackSocialLinks();
  const links = {} as SocialLinks;
  for (const key of SOCIAL_KEYS) {
    links[key] = normalizeSocialHref(key, social[key]);
  }
  return links;
}
