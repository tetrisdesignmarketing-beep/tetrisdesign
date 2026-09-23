/**
 * Link logo đối tác (admin About → carousel "ĐỐI TÁC").
 * - Trống → "" (logo không bấm được).
 * - Thiếu scheme (vd. `amway.com`, `//amway.com`) → tự thêm `https://`.
 * - Chỉ nhận http/https; `javascript:`, `mailto:`… hay chuỗi không phải URL → ""
 *   (giá trị đi thẳng vào `href` nên phải chặn scheme lạ).
 */
export function normalizePartnerHref(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";

  /* Có scheme thật (vd. "javascript:", "https:") — không nhầm "host:8080". */
  const hasScheme = /^[a-z][a-z\d+.-]*:(?!\d)/i.test(value);
  const candidate = hasScheme ? value : `https://${value.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  /* Tên miền phải có dấu chấm (tránh "abc" → https://abc/). */
  if (!url.hostname.includes(".") && url.hostname !== "localhost") return "";
  return url.href;
}

/** Hợp lệ khi để trống hoặc chuẩn hoá được. */
export function isValidPartnerHref(raw: string | null | undefined): boolean {
  const value = raw?.trim() ?? "";
  return value === "" || normalizePartnerHref(value) !== "";
}
