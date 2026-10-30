/**
 * Nhóm kiểu chữ toàn site — admin chỉnh ở /admin/pages/typography, lưu JSON
 * trong SitePage (slug `typography`). Mỗi thuộc tính có giá trị "default" =
 * giữ đúng thiết kế hiện tại của từng chỗ; chỉ thuộc tính admin đổi mới sinh
 * CSS (kèm !important để thắng class Tailwind / rule riêng của component).
 *
 * File thuần (không zod / prisma) — dùng chung cho layout server, form admin
 * và schema validate.
 */

export const TYPOGRAPHY_GROUPS = [
  "display",
  "heading",
  "label",
  "body",
  "caption",
] as const;
export type TypographyGroup = (typeof TYPOGRAPHY_GROUPS)[number];

export const TYPOGRAPHY_WEIGHTS = [
  "default",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;
export const TYPOGRAPHY_ITALIC = ["default", "normal", "italic"] as const;
export const TYPOGRAPHY_UNDERLINE = ["default", "none", "underline"] as const;
export const TYPOGRAPHY_TRANSFORM = ["default", "none", "uppercase"] as const;
export const TYPOGRAPHY_TRACKING = [
  "default",
  "0",
  "0.03",
  "0.05",
  "0.08",
  "0.12",
  "0.15",
  "0.2",
] as const;

export interface TypographyStyle {
  weight: (typeof TYPOGRAPHY_WEIGHTS)[number];
  italic: (typeof TYPOGRAPHY_ITALIC)[number];
  underline: (typeof TYPOGRAPHY_UNDERLINE)[number];
  transform: (typeof TYPOGRAPHY_TRANSFORM)[number];
  tracking: (typeof TYPOGRAPHY_TRACKING)[number];
}

export interface TypographySettings {
  groups: Record<TypographyGroup, TypographyStyle>;
}

export const TYPOGRAPHY_PROPERTY_OPTIONS = {
  weight: TYPOGRAPHY_WEIGHTS,
  italic: TYPOGRAPHY_ITALIC,
  underline: TYPOGRAPHY_UNDERLINE,
  transform: TYPOGRAPHY_TRANSFORM,
  tracking: TYPOGRAPHY_TRACKING,
} as const;

export type TypographyProperty = keyof TypographyStyle;

export const TYPOGRAPHY_PROPERTY_LABELS: Record<TypographyProperty, string> = {
  weight: "Độ đậm",
  italic: "Thẳng / nghiêng",
  underline: "Gạch chân",
  transform: "Chữ hoa",
  tracking: "Giãn chữ",
};

const WEIGHT_NAMES: Record<string, string> = {
  "300": "300 · Mảnh",
  "400": "400 · Thường",
  "500": "500 · Vừa",
  "600": "600 · Hơi đậm",
  "700": "700 · Đậm",
  "800": "800 · Rất đậm",
  "900": "900 · Đen",
};

const VALUE_LABELS: Record<Exclude<TypographyProperty, "weight">, Record<string, string>> = {
  italic: { normal: "Thẳng", italic: "Nghiêng" },
  underline: { none: "Không gạch", underline: "Gạch chân" },
  transform: { none: "Như khi nhập", uppercase: "IN HOA" },
  tracking: {
    "0": "0 (sát)",
    "0.03": "0.03em",
    "0.05": "0.05em",
    "0.08": "0.08em",
    "0.12": "0.12em",
    "0.15": "0.15em",
    "0.2": "0.2em (rộng)",
  },
};

export function typographyOptionLabel(
  property: TypographyProperty,
  value: string,
): string {
  if (value === "default") return "Mặc định (như thiết kế)";
  if (property === "weight") return WEIGHT_NAMES[value] ?? value;
  return VALUE_LABELS[property][value] ?? value;
}

export const TYPOGRAPHY_GROUP_INFO: Record<
  TypographyGroup,
  { label: string; description: string; sample: string }
> = {
  display: {
    label: "Tiêu đề lớn",
    description: "Tên dự án ở trang chi tiết, tên dịch vụ, tiêu đề blog / trang lỗi",
    sample: "Nhận diện Thương hiệu",
  },
  heading: {
    label: "Tiêu đề mục",
    description: "GIỚI THIỆU, GIẢI THƯỞNG, HÀNH TRÌNH, ĐỐI TÁC, tên nhóm giải…",
    sample: "Giới thiệu",
  },
  label: {
    label: "Nhãn / menu",
    description: "Menu, bộ lọc dự án, nút XEM DỰ ÁN, tên dự án trên lưới, nhãn liên hệ",
    sample: "Trang chủ · Dự án · Dịch vụ",
  },
  body: {
    label: "Mô tả nội dung",
    description: "Đoạn văn giới thiệu, mô tả dịch vụ / dự án, danh sách giải",
    sample:
      "Tetris Design là công ty chuyên thiết kế và thi công nội thất các không gian thương mại.",
  },
  caption: {
    label: "Chú thích nhỏ",
    description: "Thông tin phụ dưới tên dự án, ngày đăng, © footer, số đếm ảnh",
    sample: "Hà Nội · 2024 · © 2026 TETRIS DESIGN",
  },
};

export const DEFAULT_TYPOGRAPHY_STYLE: TypographyStyle = {
  weight: "default",
  italic: "default",
  underline: "default",
  transform: "default",
  tracking: "default",
};

export function defaultTypographySettings(): TypographySettings {
  return {
    groups: Object.fromEntries(
      TYPOGRAPHY_GROUPS.map((group) => [group, { ...DEFAULT_TYPOGRAPHY_STYLE }]),
    ) as TypographySettings["groups"],
  };
}

/** JSON lệch / thiếu nhóm / giá trị lạ → "default" từng ô (không rơi cả cấu hình). */
export function normalizeTypographySettings(raw: unknown): TypographySettings {
  const settings = defaultTypographySettings();
  const groups =
    raw && typeof raw === "object"
      ? (raw as { groups?: Record<string, unknown> }).groups
      : undefined;
  if (!groups || typeof groups !== "object") return settings;
  for (const group of TYPOGRAPHY_GROUPS) {
    const value = groups[group];
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    for (const property of Object.keys(
      TYPOGRAPHY_PROPERTY_OPTIONS,
    ) as TypographyProperty[]) {
      const candidate = record[property];
      const options = TYPOGRAPHY_PROPERTY_OPTIONS[property] as readonly string[];
      if (typeof candidate === "string" && options.includes(candidate)) {
        (settings.groups[group] as unknown as Record<string, string>)[property] =
          candidate;
      }
    }
  }
  return settings;
}

/** Cặp CSS property → value cho các thuộc tính admin đã đổi (bỏ "default"). */
export function typographyDeclarations(
  style: TypographyStyle,
): Array<[string, string]> {
  const declarations: Array<[string, string]> = [];
  if (style.weight !== "default") declarations.push(["font-weight", style.weight]);
  if (style.italic !== "default") declarations.push(["font-style", style.italic]);
  if (style.underline !== "default") {
    declarations.push(["text-decoration-line", style.underline]);
    if (style.underline === "underline") {
      declarations.push(["text-underline-offset", "0.2em"]);
    }
  }
  if (style.transform !== "default") {
    declarations.push(["text-transform", style.transform]);
  }
  if (style.tracking !== "default") {
    declarations.push([
      "letter-spacing",
      style.tracking === "0" ? "0" : `${style.tracking}em`,
    ]);
  }
  return declarations;
}

/** CSS chèn vào layout site — rỗng khi mọi nhóm đều "Mặc định". */
export function buildTypographyCss(settings: TypographySettings): string {
  return TYPOGRAPHY_GROUPS.map((group) => {
    const declarations = typographyDeclarations(settings.groups[group]);
    if (declarations.length === 0) return "";
    const body = declarations
      .map(([property, value]) => `${property}:${value}!important`)
      .join(";");
    return `.ts-${group}{${body}}`;
  })
    .filter(Boolean)
    .join("\n");
}
