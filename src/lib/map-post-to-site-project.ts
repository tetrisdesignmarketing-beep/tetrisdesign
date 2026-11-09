import {
  type ProjectCategory,
  type SiteProject,
  projectCategories,
} from "@/lib/site-content";
import type { PostLayoutStyle } from "@/lib/validations/post";

const PROJECT_CATEGORY_IDS = new Set<string>(
  projectCategories.map((category) => category.id),
);

export const postForSiteProjectSelect = {
  slug: true,
  title: true,
  address: true,
  concept: true,
  area: true,
  designYear: true,
  architect: true,
  description: true,
  coverImage: true,
  images: true,
  layoutStyle: true,
  categoryId: true,
  category: { select: { slug: true, name: true } },
} as const;

export type PostForSiteProject = {
  slug: string;
  title: string;
  address: string;
  concept: string;
  /* Optional: home cards select fewer columns (không cần block thông tin). */
  area?: string;
  designYear?: string;
  architect?: string;
  description: string;
  coverImage: string | null;
  images: string[];
  layoutStyle?: PostLayoutStyle;
  categoryId?: string | null;
  category: { slug: string; name: string } | null;
};

export function isProjectCategory(value: string): value is ProjectCategory {
  return PROJECT_CATEGORY_IDS.has(value);
}

export function toProjectCategory(slug?: string | null): ProjectCategory {
  if (slug && isProjectCategory(slug)) return slug;
  return "fnb";
}

export function postCoverSrc(post: PostForSiteProject) {
  return post.coverImage?.trim() || post.images[0]?.trim() || "";
}

export function mapPostToSiteProject(post: PostForSiteProject): SiteProject {
  const cover = postCoverSrc(post);
  return {
    slug: post.slug,
    title: post.title,
    category: toProjectCategory(post.category?.slug),
    categoryLabel: post.concept.trim() || post.category?.name || "",
    location: post.address,
    area: post.area,
    designYear: post.designYear,
    architect: post.architect,
    illustration: cover,
    heroImage: post.coverImage?.trim() || undefined,
    description: post.description,
    images: post.images,
    layoutStyle: post.layoutStyle ?? "LAYOUT1",
  };
}
