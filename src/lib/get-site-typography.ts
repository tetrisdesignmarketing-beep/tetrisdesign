import { prisma } from "@/lib/prisma";
import {
  defaultTypographySettings,
  normalizeTypographySettings,
  type TypographySettings,
} from "@/lib/site-typography";

/** Kiểu chữ toàn site (SitePage `typography`). DB lỗi / chưa có → mặc định (giữ thiết kế). */
export async function getSiteTypography(): Promise<TypographySettings> {
  try {
    const row = await prisma.sitePage.findUnique({
      where: { slug: "typography" },
    });
    return normalizeTypographySettings(row?.content);
  } catch {
    return defaultTypographySettings();
  }
}
