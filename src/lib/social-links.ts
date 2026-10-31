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

/** Đường dẫn của facebook.com không phải tên Page (không đổi được sang m.me). */
const FACEBOOK_RESERVED_PATHS = new Set([
  "groups",
  "events",
  "watch",
  "share",
  "sharer",
  "sharer.php",
  "photo",
  "photo.php",
  "story.php",
  "permalink.php",
  "login",
  "home.php",
  "people",
  "hashtag",
]);

/**
 * Link Fanpage → link nhắn tin Messenger `https://m.me/<page>`.
 * m.me là universal link (iOS) / app link (Android): điện thoại có Messenger
 * thì mở thẳng app, không có thì mở bản web; máy tính → messenger.com.
 * Bỏ query (vd. `?locale=vi_VN`). Hỗ trợ `facebook.com/<tên>`,
 * `profile.php?id=<số>`, `pages/<tên>/<số>`, link `m.me/...` sẵn có.
 * Không nhận ra tên Page → null.
 */
export function toMessengerHref(
  facebookHref: string | null | undefined,
): string | null {
  const value = facebookHref?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  const toMe = (handle: string) => `https://m.me/${encodeURIComponent(handle)}`;

  if (hostname === "m.me" || hostname === "www.m.me") {
    return segments[0] ? toMe(segments[0]) : null;
  }
  const host = hostname.replace(/^(www|m|web|mbasic)\./, "");
  if (host !== "facebook.com" && host !== "fb.com") return null;

  const first = segments[0];
  if (!first) return null;
  if (first === "profile.php") {
    const id = url.searchParams.get("id");
    return id && /^\d+$/.test(id) ? toMe(id) : null;
  }
  if (first === "pages") {
    const id = segments.at(-1);
    return id && /^\d+$/.test(id) ? toMe(id) : null;
  }
  if (FACEBOOK_RESERVED_PATHS.has(first.toLowerCase())) return null;
  return /^[\w.-]+$/.test(first) ? toMe(first) : null;
}
