import { z } from "zod";
import { VN_PROVINCES } from "@/lib/vn-provinces";
import { mediaPathSchema } from "@/lib/validations/shared";
import { isValidPartnerHref, normalizePartnerHref } from "@/lib/partner-href";
import {
  TYPOGRAPHY_GROUPS,
  TYPOGRAPHY_ITALIC,
  TYPOGRAPHY_TRACKING,
  TYPOGRAPHY_TRANSFORM,
  TYPOGRAPHY_UNDERLINE,
  TYPOGRAPHY_WEIGHTS,
  type TypographyGroup,
} from "@/lib/site-typography";
import {
  isValidSocialHref,
  normalizeSocialHref,
  type SocialKey,
} from "@/lib/social-links";

export const SITE_PAGE_SLUGS = [
  "home",
  "about",
  "projects",
  "services",
  "contact",
  "typography",
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
  /** Tên giải — in đậm trên trang. */
  title: z.string().min(1, "Tên giải không được để trống").max(300),
  /** Dự án / ghi chú sau tên giải (vd. "Genji Steak") — chữ thường. */
  project: z.string().max(300).optional(),
});

const LEGACY_AWARD_SEPARATOR = /\s+[—–]\s+/;

/**
 * Giải lưu trước khi có `project`: "Tên giải — Dự án" trong 1 ô `title` →
 * tách ở dấu gạch dài đầu tiên. Chỉ chạy khi chưa có `project` (lưu từ admin
 * luôn có, kể cả rỗng) nên không tách lại lần 2.
 */
function splitLegacyAwardItems(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    const record = block as Record<string, unknown> | null;
    if (record?.type !== "awards" || !Array.isArray(record.groups)) return block;
    const groups = record.groups.map((group: Record<string, unknown> | null) => {
      if (!group || !Array.isArray(group.items)) return group;
      const items = group.items.map((item: Record<string, unknown> | null) => {
        if (!item || item.project !== undefined || typeof item.title !== "string") {
          return item;
        }
        const match = LEGACY_AWARD_SEPARATOR.exec(item.title);
        if (!match) return item;
        return {
          ...item,
          title: item.title.slice(0, match.index),
          project: item.title.slice(match.index + match[0].length),
        };
      });
      return { ...group, items };
    });
    return { ...record, groups };
  });
}

const awardGroupSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(awardItemSchema).min(1),
});

/**
 * Link logo đối tác — lưu DB / đọc public. `optional` để JSON cũ (chưa có
 * field) vẫn parse được (không rơi về nội dung mặc định). Chuẩn hoá khi lưu:
 * tự thêm https://, bỏ scheme không phải http(s).
 */
const partnerHrefStoredSchema = z
  .string()
  .max(2048)
  .optional()
  .transform((value) => normalizePartnerHref(value));

/** Form admin — luôn là string (input = output cho RHF + zodResolver). */
const partnerHrefFormSchema = z
  .string()
  .max(2048, "Link tối đa 2048 ký tự")
  .refine(
    isValidPartnerHref,
    "Link không hợp lệ (vd. amway.com hoặc https://amway.com)",
  );

const aboutTextBlockSchema = z.object({
  type: z.literal("text"),
  title: z.string().min(1, "Tiêu đề không được để trống").max(200),
  paragraphs: z
    .array(z.string().min(1, "Đoạn văn không được để trống"))
    .min(1, "Cần ít nhất một đoạn"),
});

const aboutAwardsBlockSchema = z.object({
  type: z.literal("awards"),
  title: z.string().min(1, "Tiêu đề không được để trống").max(200),
  groups: z.array(awardGroupSchema).min(1, "Cần ít nhất một nhóm"),
});

/**
 * Vạch Brand break trong danh sách khối — trang hiển thị đúng thứ tự admin:
 * khối trước vạch nằm trong hero, khối sau vạch nằm dưới brand break.
 * Ảnh vẫn ở `brandBreakImage` (admin hiển thị picker ngay tại dòng này).
 */
const aboutBrandBreakBlockSchema = z.object({
  type: z.literal("brandBreak"),
});

const aboutBlockSchema = z.discriminatedUnion("type", [
  aboutTextBlockSchema,
  aboutAwardsBlockSchema,
  aboutBrandBreakBlockSchema,
]);

/** Đúng 1 Brand break, có ≥ 1 khối trước và sau — animation hero / brand break cần chữ. */
const aboutBlocksSchema = z.array(aboutBlockSchema).superRefine((blocks, ctx) => {
  const breaks = blocks.filter((block) => block.type === "brandBreak").length;
  if (breaks !== 1) {
    ctx.addIssue({ code: "custom", message: "Cần đúng một mục Brand break" });
    return;
  }
  const index = blocks.findIndex((block) => block.type === "brandBreak");
  if (index === 0 || index === blocks.length - 1) {
    ctx.addIssue({
      code: "custom",
      message: "Cần ít nhất một khối nội dung trước và sau Brand break",
    });
  }
});

/**
 * Dữ liệu cũ → danh sách `blocks` có vạch Brand break, để nội dung đã lưu
 * vẫn hiển thị đúng mà không cần migrate DB (lưu lại từ admin ghi kiểu mới):
 * - introduction / awards / journey cố định;
 * - blocks có `placement` (top/bottom) nhưng chưa có vạch.
 */
function migrateLegacyAboutContent(raw: unknown): unknown {
  const migrated = migrateLegacyAboutBlocks(raw);
  if (!migrated || typeof migrated !== "object" || Array.isArray(migrated)) {
    return migrated;
  }
  const record = migrated as Record<string, unknown>;
  if (!Array.isArray(record.blocks)) return migrated;
  return { ...record, blocks: splitLegacyAwardItems(record.blocks) };
}

function migrateLegacyAboutBlocks(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const record = raw as Record<string, unknown>;
  const brandBreak = { type: "brandBreak" };

  if (Array.isArray(record.blocks)) {
    const blocks = record.blocks as Array<Record<string, unknown> | null>;
    const hasBreak = blocks.some((block) => block?.type === "brandBreak");
    if (hasBreak || !blocks.some((block) => block && "placement" in block)) {
      return raw;
    }
    const top = blocks.filter((block) => block?.placement !== "bottom");
    const bottom = blocks.filter((block) => block?.placement === "bottom");
    return { ...record, blocks: [...top, brandBreak, ...bottom] };
  }

  const { introduction, awards, journey, ...rest } = record;
  if (!introduction && !awards && !journey) return raw;
  const asObject = (value: unknown) =>
    value && typeof value === "object" ? value : {};
  const blocks: unknown[] = [];
  if (introduction) blocks.push({ ...asObject(introduction), type: "text" });
  if (awards) blocks.push({ ...asObject(awards), type: "awards" });
  blocks.push(brandBreak);
  if (journey) blocks.push({ ...asObject(journey), type: "text" });
  return { ...rest, blocks };
}

const aboutPageBaseSchema = z.object({
  heroImage: mediaPathSchema,
  brandBreakImage: mediaPathSchema,
  blocks: aboutBlocksSchema,
  partners: z.object({
    title: z.string().min(1).max(200),
    items: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          logo: mediaPathSchema,
          href: partnerHrefStoredSchema,
        }),
      )
      .min(1),
  }),
});

export const aboutPageSchema = z.preprocess(
  migrateLegacyAboutContent,
  aboutPageBaseSchema,
);

/** Form admin About — giống `aboutPageSchema`, chỉ khác `href` đối tác. */
export const aboutPageFormSchema = aboutPageBaseSchema.extend({
  partners: z.object({
    title: z.string().min(1).max(200),
    items: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          logo: mediaPathSchema,
          href: partnerHrefFormSchema,
        }),
      )
      .min(1),
  }),
});

export const siteServiceSchema = z.object({
  title: z.string().min(1).max(200),
  /** Nhãn phụ (vd. tiếng Anh "BRAND IDENTITY") — hiện trên mô tả; không bắt buộc. */
  label: z.string().trim().max(120).optional(),
  /** Layout thẻ: dòng nhóm phía trên tiêu đề (vd. "Thiết kế", "Thi công"). */
  group: z.string().trim().max(120).optional(),
  /** Layout thẻ: tên ngắn ở hero (vd. "Thương hiệu"); trống → dùng tiêu đề. */
  shortTitle: z.string().trim().max(120).optional(),
  description: z.string().min(1),
  image: mediaPathSchema,
  imageAlt: z.string().min(1).max(200),
});

/** Layout trang /services admin chọn: service = mặc định (thẻ dịch vụ), service1 = xấp ảnh, service2 = cột co giãn. */
export const SERVICES_LAYOUTS = ["service", "service1", "service2"] as const;
export type ServicesLayout = (typeof SERVICES_LAYOUTS)[number];
export const DEFAULT_SERVICES_LAYOUT: ServicesLayout = "service";
export const servicesLayoutSchema = z.enum(SERVICES_LAYOUTS);

export const servicesPageSchema = z.object({
  /* Không bắt buộc (không dùng .default để input/output RHF cùng type);
     dữ liệu cũ chưa có layout → đọc là DEFAULT_SERVICES_LAYOUT. */
  layout: servicesLayoutSchema.optional(),
  items: z.array(siteServiceSchema).min(1, "Cần ít nhất một dịch vụ"),
});

/** `z.enum` giữ input/output cùng type — tránh lệch Resolver với RHF + zodResolver. */
const vnProvinceField = z.enum(VN_PROVINCES, {
  error: "Chọn tỉnh / thành phố",
});

/** Form admin — luôn là string (input = output cho RHF + zodResolver). */
function socialHrefFormField(key: SocialKey) {
  return z
    .string()
    .max(2048)
    .refine((value) => isValidSocialHref(key, value), {
      message:
        key === "zalo"
          ? "Nhập số điện thoại hoặc link Zalo hợp lệ"
          : "Link không hợp lệ (vd. facebook.com/tentrang)",
    });
}

/** Lưu DB — chuẩn hoá lại phía server; thiếu/sai → "" (ẩn icon). */
function socialHrefStoredField(key: SocialKey) {
  return z
    .string()
    .max(2048)
    .optional()
    .transform((value) => normalizeSocialHref(key, value));
}

export const contactSocialFormSchema = z.object({
  facebook: socialHrefFormField("facebook"),
  instagram: socialHrefFormField("instagram"),
  tiktok: socialHrefFormField("tiktok"),
  behance: socialHrefFormField("behance"),
  zalo: socialHrefFormField("zalo"),
});

const contactSocialStoredSchema = z.object({
  facebook: socialHrefStoredField("facebook"),
  instagram: socialHrefStoredField("instagram"),
  tiktok: socialHrefStoredField("tiktok"),
  behance: socialHrefStoredField("behance"),
  zalo: socialHrefStoredField("zalo"),
});

/** Form admin — chưa ghép `address` (ghép lúc submit). */
export const contactPageFormSchema = z.object({
  email: z.email("Email không hợp lệ"),
  phone: z.string().min(1, "Số điện thoại không được để trống").max(50),
  /** Mã số thuế — để trống thì ẩn trên trang Liên hệ. 10 số, hoặc 10 số + "-" + 3 số (chi nhánh). */
  taxCode: z
    .string()
    .trim()
    .regex(/^(\d{10}(-\d{3})?)?$/, "Mã số thuế gồm 10 số (hoặc 10 số-3 số)"),
  addressLine: z
    .string()
    .min(1, "Địa chỉ chi tiết không được để trống")
    .max(400, "Địa chỉ chi tiết tối đa 400 ký tự"),
  province: vnProvinceField,
  /** Link icon mạng xã hội ở footer — ô trống = ẩn icon. */
  social: contactSocialFormSchema,
});

/**
 * Lưu DB + public — có `address` đã ghép (line + tỉnh + Việt Nam).
 * `social` optional: dữ liệu lưu trước khi có tính năng này không có trường
 * này → site dùng link mặc định (xem resolveSocialLinks).
 */
export const contactPageSchema = contactPageFormSchema.extend({
  address: z.string().min(1, "Địa chỉ không được để trống").max(500),
  /* Dữ liệu cũ chưa có → dùng mã số thuế mặc định (xem resolveContactTaxCode). */
  taxCode: z.string().trim().max(50).optional(),
  social: contactSocialStoredSchema.optional(),
});

export { contactSocialStoredSchema };

/** Layout /projects — list dự án nằm ở Post, không lưu trong JSON này. */
export const projectsPageSchema = z.object({
  note: z.string().optional(),
});

const typographyStyleSchema = z.object({
  weight: z.enum(TYPOGRAPHY_WEIGHTS),
  italic: z.enum(TYPOGRAPHY_ITALIC),
  underline: z.enum(TYPOGRAPHY_UNDERLINE),
  transform: z.enum(TYPOGRAPHY_TRANSFORM),
  tracking: z.enum(TYPOGRAPHY_TRACKING),
});

/** Kiểu chữ toàn site — xem lib/site-typography.ts. */
export const typographyPageSchema = z.object({
  groups: z.object(
    Object.fromEntries(
      TYPOGRAPHY_GROUPS.map((group) => [group, typographyStyleSchema]),
    ) as Record<TypographyGroup, typeof typographyStyleSchema>,
  ),
});

export const sitePageSchemas = {
  home: homePageSchema,
  about: aboutPageSchema,
  projects: projectsPageSchema,
  services: servicesPageSchema,
  contact: contactPageSchema,
  typography: typographyPageSchema,
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

export type AboutPageContent = z.infer<typeof aboutPageBaseSchema>;
export type AboutPageBlock = AboutPageContent["blocks"][number];
/** Khối nội dung (không gồm vạch Brand break). */
export type AboutContentBlock = Exclude<AboutPageBlock, { type: "brandBreak" }>;

export type AboutTextBlock = z.infer<typeof aboutTextBlockSchema>;
export type AboutAwardsBlock = z.infer<typeof aboutAwardsBlockSchema>;
export type ServicesPageContent = z.infer<typeof servicesPageSchema>;
/** Form admin Services — items có thể rỗng trước khi lưu. */
export type ServicesPageFormValues = {
  layout?: ServicesLayout;
  items: Array<{
    title: string;
    label?: string;
    group?: string;
    shortTitle?: string;
    description: string;
    image: string;
    imageAlt: string;
  }>;
};
export type ContactPageFormValues = z.infer<typeof contactPageFormSchema>;
export type ContactPageContent = z.infer<typeof contactPageSchema>;
export type ProjectsPageContent = z.infer<typeof projectsPageSchema>;
