import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  getSitePageFallback,
  normalizeContactPageContent,
} from "@/lib/site-page-defaults";
import type { ContactPageContent } from "@/lib/validations/site-page";

/**
 * Trang liên hệ public: `SitePage` slug `contact`.
 * Chưa có row / JSON lệch / DB lỗi → fallback từ `siteContact`.
 * Map iframe / pin link derive từ `address` đã ghép (Phase B).
 */
/* React `cache`: layout (JSON-LD) + page cùng gọi trong 1 lần dựng trang → 1 query. */
export const getSiteContact = cache(async (): Promise<ContactPageContent> => {
  try {
    const row = await prisma.sitePage.findUnique({
      where: { slug: "contact" },
    });
    const normalized = normalizeContactPageContent(row?.content);
    if (normalized) {
      return normalized;
    }
  } catch {
    // giữ copy hardcode khi không kết nối được DB
  }

  return getSitePageFallback("contact");
});
