"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectsCategory } from "@/components/site/projects-category-context";
import { projectCategories } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface ProjectFilterProps {
  /** `header` = dính dưới site header (document). `scroller` = đỉnh inner pager. */
  stickTo?: "header" | "scroller";
}

/**
 * Chuyển tab category qua `ProjectsCategoryProvider` (state client, không
 * `router.push`) — data toàn bộ dự án đã fetch 1 lần, đổi tab lọc tức thì,
 * không còn màn loading / gọi API lại. `<Link>` vẫn giữ `href` đúng cho
 * accessibility / mở tab mới; `onClick` chặn điều hướng mặc định.
 */
export function ProjectFilter({ stickTo = "header" }: ProjectFilterProps) {
  const pathname = usePathname();
  const { category: active, setCategory } = useProjectsCategory();

  return (
    <nav
      className={cn(
        "sticky z-20 shrink-0 bg-background",
        stickTo === "scroller"
          ? "top-0"
          : "top-[var(--site-header-total-height)]",
      )}
      aria-label="Lọc dự án theo danh mục"
    >
      {/* Mobile — giữ nguyên: 3 tab + toggle active → tất cả */}
      <ul className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:hidden">
        {projectCategories.map((category) => {
          const isActive = active === category.id;
          const href = isActive
            ? pathname
            : `${pathname}?category=${category.id}`;

          return (
            <li key={category.id} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                scroll={false}
                prefetch={false}
                onClick={(event) => {
                  event.preventDefault();
                  setCategory(isActive ? null : category.id);
                }}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center touch-manipulation text-xs font-medium uppercase tracking-[0.25em]",
                  isActive
                    ? "text-brand-red"
                    : "text-foreground hover:text-brand-red",
                )}
              >
                {category.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop — TẤT CẢ + categories; active = underline; radio select */}
      <ul className="mx-auto hidden w-full max-w-6xl items-center justify-between px-4 py-6 md:flex">
        <li className="flex min-w-0 flex-1 justify-center">
          <Link
            href={pathname}
            scroll={false}
            prefetch={false}
            aria-current={active === null ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (active === null) return;
              setCategory(null);
            }}
            className={cn(
              "inline-flex min-h-11 items-center justify-center border-b border-transparent pb-0.5 text-sm font-medium uppercase tracking-[0.25em] text-foreground transition-colors",
              active === null
                ? "border-foreground"
                : "hover:border-foreground/40",
            )}
          >
            TẤT CẢ
          </Link>
        </li>
        {projectCategories.map((category) => {
          const isActive = active === category.id;
          const href = `${pathname}?category=${category.id}`;

          return (
            <li key={category.id} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                scroll={false}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (isActive) return;
                  setCategory(category.id);
                }}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center border-b border-transparent pb-0.5 text-sm font-medium uppercase tracking-[0.25em] text-foreground transition-colors",
                  isActive
                    ? "border-foreground"
                    : "hover:border-foreground/40",
                )}
              >
                {category.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
