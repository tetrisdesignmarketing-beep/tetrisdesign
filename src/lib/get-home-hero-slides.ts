import { prisma } from "@/lib/prisma";
import { siteHeroSlides, type HeroSlide } from "@/lib/site-content";
import { homePageSchema } from "@/lib/validations/site-page";

export type HeroSlideView = {
  title: string;
  location: string;
  href: string;
  mobileImage: string;
  desktopImage: string;
};

/** Nút "XEM DỰ ÁN" fallback khi admin chưa gán link riêng cho slide. */
export const DEFAULT_HERO_SLIDE_HREF = "/projects";

/** Chưa gán link (rỗng/toàn khoảng trắng) → fallback /projects. */
export function resolveHeroSlideHref(href: string | undefined | null): string {
  const trimmed = href?.trim();
  return trimmed ? trimmed : DEFAULT_HERO_SLIDE_HREF;
}

/** Ghép MOBILE[i] + DESKTOP[i]; thiếu một phía → dùng ảnh còn lại. */
export function pairHeroSlidesByScreen(slides: HeroSlide[]): HeroSlideView[] {
  const mobile = slides.filter((slide) => slide.screenType !== "DESKTOP");
  const desktop = slides.filter((slide) => slide.screenType === "DESKTOP");

  if (desktop.length === 0) {
    return mobile.map((slide) => ({
      title: slide.title,
      location: slide.location,
      href: resolveHeroSlideHref(slide.href),
      mobileImage: slide.image,
      desktopImage: slide.image,
    }));
  }

  const count = Math.max(mobile.length, desktop.length);
  const paired: HeroSlideView[] = [];
  for (let index = 0; index < count; index += 1) {
    const mobileSlide = mobile[index];
    const desktopSlide = desktop[index];
    const meta = mobileSlide ?? desktopSlide;
    if (!meta) continue;
    paired.push({
      title: meta.title,
      location: meta.location,
      href: resolveHeroSlideHref(meta.href),
      mobileImage: mobileSlide?.image ?? desktopSlide?.image ?? "",
      desktopImage: desktopSlide?.image ?? mobileSlide?.image ?? "",
    });
  }
  return paired.filter((slide) => slide.mobileImage || slide.desktopImage);
}

/**
 * Slider trang chủ public: `SitePage` slug `home`.
 * Chưa có row / JSON lệch / DB lỗi → `siteHeroSlides` để landing không trống.
 */
export async function getHomeHeroSlides(): Promise<HeroSlideView[]> {
  try {
    const row = await prisma.sitePage.findUnique({ where: { slug: "home" } });
    const parsed = homePageSchema.safeParse(row?.content);
    if (parsed.success && parsed.data.slides.length > 0) {
      return pairHeroSlidesByScreen(parsed.data.slides);
    }
  } catch {
    // giữ hero hardcode khi không kết nối được DB
  }

  return pairHeroSlidesByScreen(siteHeroSlides);
}
