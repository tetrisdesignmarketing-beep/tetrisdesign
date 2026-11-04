import {
  SITE_PAGE_SLUGS,
  isSitePageSlug,
  type SitePageSlug,
} from "@/lib/validations/site-page";

export const ADMIN_LAYOUT_PAGES: Record<
  SitePageSlug,
  { label: string; description: string }
> = {
  home: {
    label: "Trang chủ",
    description: "Ảnh và nội dung slider hero",
  },
  about: {
    label: "Giới thiệu",
    description: "Hero, intro, giải thưởng, hành trình, đối tác",
  },
  projects: {
    label: "Dự án",
    description: "Danh sách dự án quản lý ở Bài đăng",
  },
  services: {
    label: "Dịch vụ",
    description: "Khối dịch vụ — title, mô tả, ảnh",
  },
  contact: {
    label: "Liên hệ",
    description: "Email, SĐT, địa chỉ chi tiết + tỉnh/TP Việt Nam",
  },
  typography: {
    label: "Kiểu chữ",
    description:
      "Độ đậm, nghiêng, gạch chân, chữ hoa, giãn chữ cho từng nhóm chữ — áp dụng mọi trang",
  },
};

export const ADMIN_LAYOUT_PAGE_LIST = SITE_PAGE_SLUGS.map((slug) => ({
  slug,
  href: `/admin/pages/${slug}`,
  ...ADMIN_LAYOUT_PAGES[slug],
}));

export function getAdminLayoutPage(slug: string) {
  if (!isSitePageSlug(slug)) return null;
  return { slug, href: `/admin/pages/${slug}`, ...ADMIN_LAYOUT_PAGES[slug] };
}

export const ADMIN_NAV = {
  layout: { href: "/admin/pages", label: "Layout" },
  posts: { href: "/admin/posts", label: "Bài đăng" },
  news: { href: "/admin/news", label: "Tin tức" },
  categories: { href: "/admin/categories", label: "Category" },
} as const;
