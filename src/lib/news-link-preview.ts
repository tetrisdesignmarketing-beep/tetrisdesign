import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NEWS_DESCRIPTION_MAX, isHttpUrl } from "@/lib/validations/news";

/**
 * Đọc og:title / og:description / og:image của một trang tin để điền sẵn form
 * admin. Chạy phía server → chặn địa chỉ nội bộ (SSRF), giới hạn thời gian,
 * số lần redirect và dung lượng tải.
 */
export interface NewsLinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
}

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
/* Thẻ meta nằm trong <head> — không cần tải hết trang. */
const MAX_BYTES = 1_500_000;

export class LinkPreviewError extends Error {}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80")
  );
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new LinkPreviewError("Link không hợp lệ");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new LinkPreviewError("Không tìm thấy trang (sai tên miền?)");
      });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new LinkPreviewError("Link không hợp lệ");
  }
}

/* Theo redirect thủ công để kiểm tra từng host đích. */
async function fetchHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let current = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TetrisNewsPreview/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      if (!isHttpUrl(current.href)) throw new LinkPreviewError("Link không hợp lệ");
      continue;
    }
    if (!response.ok) {
      throw new LinkPreviewError(`Trang trả về lỗi ${response.status}`);
    }
    const type = response.headers.get("content-type") ?? "";
    if (type && !/html|xml/i.test(type)) {
      throw new LinkPreviewError("Link không phải trang web (HTML)");
    }
    const bytes = await readLimited(response);
    return { html: decode(bytes, type), finalUrl: current.href };
  }
  throw new LinkPreviewError("Trang chuyển hướng quá nhiều lần");
}

async function readLimited(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function decode(bytes: Uint8Array, contentType: string): string {
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 4096));
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

function clean(value: string | undefined): string {
  return decodeEntities(value ?? "").replace(/\s+/g, " ").trim();
}

/** Gom <meta property|name=... content=...> (thứ tự thuộc tính bất kỳ). */
function readMetaTags(html: string): Map<string, string> {
  const metas = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs.set(m[1].toLowerCase(), m[3] ?? m[4] ?? m[5] ?? "");
    }
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content");
    if (key && content !== undefined && !metas.has(key)) metas.set(key, content);
  }
  return metas;
}

export function parseLinkPreview(html: string, pageUrl: string): NewsLinkPreview {
  const meta = readMetaTags(html);
  const pick = (...keys: string[]) => keys.map((k) => clean(meta.get(k))).find(Boolean) ?? "";
  const title =
    pick("og:title", "twitter:title") ||
    clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
  const description = pick("og:description", "twitter:description", "description");
  let image = "";
  const rawImage = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl).href;
      if (isHttpUrl(resolved)) image = resolved;
    } catch {
      /* ảnh lỗi → admin tự chọn từ Media */
    }
  }
  const canonical = pick("og:url");
  return {
    url: canonical && isHttpUrl(canonical) ? canonical : pageUrl,
    title: title.slice(0, 300),
    description:
      description.length > NEWS_DESCRIPTION_MAX
        ? `${description.slice(0, NEWS_DESCRIPTION_MAX - 1).trimEnd()}…`
        : description,
    image: image.length <= 2048 ? image : "",
  };
}

export async function fetchLinkPreview(rawUrl: string): Promise<NewsLinkPreview> {
  try {
    const { html, finalUrl } = await fetchHtml(rawUrl);
    const preview = parseLinkPreview(html, finalUrl);
    /* Giữ đúng link admin dán (có thể có tracking/AMP mà họ muốn giữ). */
    return { ...preview, url: rawUrl };
  } catch (err) {
    if (err instanceof LinkPreviewError) throw err;
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new LinkPreviewError("Trang phản hồi quá lâu");
    }
    throw new LinkPreviewError("Không đọc được trang này");
  }
}
