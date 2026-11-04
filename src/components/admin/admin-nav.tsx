"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

function navClass(active: boolean) {
  return cn(
    "whitespace-nowrap text-sm hover:text-foreground",
    active ? "font-medium text-foreground" : "text-muted-foreground",
  );
}

export function AdminNav() {
  const pathname = usePathname() ?? "";

  const layoutActive = pathname.startsWith(ADMIN_NAV.layout.href);
  const postsActive =
    pathname === ADMIN_NAV.posts.href ||
    pathname.startsWith(`${ADMIN_NAV.posts.href}/`);
  const categoriesActive = pathname.startsWith(ADMIN_NAV.categories.href);
  const newsActive = pathname.startsWith(ADMIN_NAV.news.href);

  return (
    <nav className="flex items-center gap-3 overflow-x-auto text-sm sm:gap-4">
      <Link href={ADMIN_NAV.layout.href} className={navClass(layoutActive)}>
        {ADMIN_NAV.layout.label}
      </Link>
      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
      <Link href={ADMIN_NAV.posts.href} className={navClass(postsActive)}>
        {ADMIN_NAV.posts.label}
      </Link>
      <Link
        href={ADMIN_NAV.categories.href}
        className={navClass(categoriesActive)}
      >
        {ADMIN_NAV.categories.label}
      </Link>
      <Link href={ADMIN_NAV.news.href} className={navClass(newsActive)}>
        {ADMIN_NAV.news.label}
      </Link>
    </nav>
  );
}
