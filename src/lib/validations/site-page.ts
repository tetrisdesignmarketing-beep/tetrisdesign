import { z } from "zod";
import { VN_PROVINCES } from "@/lib/vn-provinces";
import { mediaPathSchema } from "@/lib/validations/shared";

export const SITE_PAGE_SLUGS = [
  "home",
  "about",
  "projects",
  "services",
  "contact",
] as const;

export const sitePageSlugSchema = z.enum(SITE_PAGE_SLUGS);

export type SitePageSlug = z.infer<typeof sitePageSlugSchema>;

export function isSitePageSlug(value: string): value is SitePageSlug {
  return (SITE_PAGE_SLUGS as readonly string[]).includes(value);
}

export const heroScreenTypeSchema = z.enum(["MOBILE", "DESKTOP"]);

export type HeroScreenType = z.infer<typeof heroScreenTypeSchema>;

export const heroSlideSchema = z.object({
  image: mediaPathSchema,
  title: z.string().min(1, "Tiêu đề slide không được để trống").max(200),
  location: z.string().min(1, "Địa điểm không được để trống").max(200),
  /** Để trống → nút "XEM DỰ ÁN" fallback sang /projects (xem resolveHeroSlideHref). */
  href: z.string().max(500).optional().default(""),
  /** Legacy JSON thiếu field → MOBILE. */
  screenType: heroScreenTypeSchema.default("MOBILE"),
});

export const homePageSchema = z.object({
  slides: z.array(heroSlideSchema).min(1, "Cần ít nhất một slide"),
});

/** Form admin — mỗi section = 1 cặp ảnh Mobile + Desktop. */
export const homePageFormSlideSchema = z.object({
  title: z.string().min(1, "Tiêu đề slide không được để trống").max(200),
  location: z.string().min(1, "Địa điểm không được để trống").max(200),
  /** Để trống → nút "XEM DỰ ÁN" fallback sang /projects. */
  href: z.string().max(500),
  mobileImage: mediaPathSchema,
  desktopImage: mediaPathSchema,
});

export const homePageFormSchema = z.object({
  slides: z.array(homePageFormSlideSchema).min(1, "Cần ít nhất một slide"),
});

const awardItemSchema = z.object({
  year: z.number().int().min(1900).max(3000),
  title: z.string().min(1).max(300),
});

const awardGroupSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(awardItemSchema).min(1),
});

export const aboutPageSchema = z.object({
  heroImage: mediaPathSchema,
  brandBreakImage: mediaPathSchema,
  introduction: z.object({
    title: z.string().min(1).max(200),
    paragraphs: z.array(z.string().min(1)).min(1),
  }),
  awards: z.object({
    title: z.string().min(1).max(200),
    groups: z.array(awardGroupSchema).min(1),
  }),
  journey: z.object({
    title: z.string().min(1).max(200),
    paragraphs: z.array(z.string().min(1)).min(1),
  }),
  partners: z.object({
    title: z.string().min(1).max(200),
    items: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          logo: mediaPathSchema,
        }),
      )
      .min(1),
  }),
});

export const siteServiceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  image: mediaPathSchema,
  imageAlt: z.string().min(1).max(200),
});

export const servicesPageSchema = z.object({
  items: z.array(siteServiceSchema).min(1, "Cần ít nhất một dịch vụ"),
});

/** `z.enum` giữ input/output cùng type — tránh lệch Resolver với RHF + zodResolver. */
const vnProvinceField = z.enum(VN_PROVINCES, {
  error: "Chọn tỉnh / thành phố",
});

/** Form admin — chưa ghép `address` (ghép lúc submit). */
export const contactPageFormSchema = z.object({
  email: z.email("Email không hợp lệ"),
  phone: z.string().min(1, "Số điện thoại không được để trống").max(50),
  addressLine: z
    .string()
    .min(1, "Địa chỉ chi tiết không được để trống")
    .max(400, "Địa chỉ chi tiết tối đa 400 ký tự"),
  province: vnProvinceField,
});

/** Lưu DB + public — có `address` đã ghép (line + tỉnh + Việt Nam). */
export const contactPageSchema = contactPageFormSchema.extend({
  address: z.string().min(1, "Địa chỉ không được để trống").max(500),
});

/** Layout /projects — list dự án nằm ở Post, không lưu trong JSON này. */
export const projectsPageSchema = z.object({
  note: z.string().optional(),
});

export const sitePageSchemas = {
  home: homePageSchema,
  about: aboutPageSchema,
  projects: projectsPageSchema,
  services: servicesPageSchema,
  contact: contactPageSchema,
} as const;

export function parseSitePageContent(slug: SitePageSlug, content: unknown) {
  return sitePageSchemas[slug].safeParse(content);
}

export type HomePageContent = z.infer<typeof homePageSchema>;
/** Form admin Home — slides có thể rỗng trước khi lưu. */
export type HomePageFormValues = {
  slides: Array<{
    title: string;
    location: string;
    href: string;
    mobileImage: string;
    desktopImage: string;
  }>;
};

/** Flat CMS slides → form sections (ghép MOBILE[i] + DESKTOP[i]). */
export function homeSlidesToFormValues(
  slides: HomePageContent["slides"],
): HomePageFormValues {
  const mobile = slides.filter((slide) => slide.screenType === "MOBILE");
  const desktop = slides.filter((slide) => slide.screenType === "DESKTOP");

  if (desktop.length === 0) {
    return {
      slides: mobile.map((slide) => ({
        title: slide.title,
        location: slide.location,
        href: slide.href,
        mobileImage: slide.image,
        desktopImage: slide.image,
      })),
    };
  }

  const count = Math.max(mobile.length, desktop.length);
  const formSlides: HomePageFormValues["slides"] = [];
  for (let index = 0; index < count; index += 1) {
    const mobileSlide = mobile[index];
    const desktopSlide = desktop[index];
    const meta = mobileSlide ?? desktopSlide;
    if (!meta) continue;
    formSlides.push({
      title: meta.title,
      location: meta.location,
      href: meta.href,
      mobileImage: mobileSlide?.image ?? desktopSlide?.image ?? "",
      desktopImage: desktopSlide?.image ?? mobileSlide?.image ?? "",
    });
  }
  return { slides: formSlides };
}

/** Form sections → flat CMS slides (MOBILE rồi DESKTOP theo thứ tự section). */
export function homeFormValuesToSlides(
  form: HomePageFormValues,
): HomePageContent["slides"] {
  return form.slides.flatMap((slide) => [
    {
      image: slide.mobileImage,
      title: slide.title,
      location: slide.location,
      href: slide.href,
      screenType: "MOBILE" as const,
    },
    {
      image: slide.desktopImage,
      title: slide.title,
      location: slide.location,
      href: slide.href,
      screenType: "DESKTOP" as const,
    },
  ]);
}

export type AboutPageContent = z.infer<typeof aboutPageSchema>;
export type ServicesPageContent = z.infer<typeof servicesPageSchema>;
/** Form admin Services — items có thể rỗng trước khi lưu. */
export type ServicesPageFormValues = {
  items: Array<{
    title: string;
    description: string;
    image: string;
    imageAlt: string;
  }>;
};
export type ContactPageFormValues = z.infer<typeof contactPageFormSchema>;
export type ContactPageContent = z.infer<typeof contactPageSchema>;
export type ProjectsPageContent = z.infer<typeof projectsPageSchema>;
