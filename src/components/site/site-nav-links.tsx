"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteLoading } from "@/components/site/site-loading-context";
import { siteNav } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type MobileMenuPhase = "closed" | "opening" | "open" | "closing";

interface SiteNavLinksProps {
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
  inverted?: boolean;
  /** Mobile overlay — drives stagger via `.mobile-menu-links` in globals.css */
  menuPhase?: MobileMenuPhase;
}

export function SiteNavLinks({
  className,
  linkClassName,
  onNavigate,
  inverted,
  menuPhase,
}: SiteNavLinksProps) {
  const pathname = usePathname();
  const { navigateWithLoading } = useSiteLoading();

  return (
    <nav
      className={cn(menuPhase !== undefined && "mobile-menu-links", className)}
      data-phase={menuPhase}
      aria-label="Main navigation"
    >
      <ul
        className={cn(
          "flex flex-col items-center lg:flex-row",
          menuPhase !== undefined ? "gap-0" : "gap-8 lg:gap-8",
        )}
      >
        {siteNav.map((item) => {
          const isAdminLink = item.href.startsWith("/admin");
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={!isActive && !isAdminLink}
                onClick={(event) => {
                  onNavigate?.();
                  if (isActive || isAdminLink) return;
                  event.preventDefault();
                  navigateWithLoading(item.href);
                }}
                aria-current={
                  menuPhase !== undefined && isActive ? "page" : undefined
                }
                className={cn(
                  menuPhase === undefined &&
                    "site-label-text uppercase tracking-[0.2em] transition-colors",
                  isActive && menuPhase === undefined
                    ? inverted
                      ? "text-white"
                      : "text-brand-red"
                    : menuPhase === undefined
                      ? inverted
                        ? "text-white/90 hover:text-white"
                        : "text-foreground hover:text-brand-red"
                      : undefined,
                  linkClassName,
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
