import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SiteStatusPageProps {
  code: string;
  title: string;
  description: string;
  /** Nút/link hành động (mặc định: về trang chủ + xem dự án). */
  actions?: ReactNode;
  className?: string;
}

const linkClass =
  "site-label-text inline-flex items-center justify-center border border-foreground px-5 py-3 uppercase tracking-[0.2em] transition-colors hover:border-brand-red hover:text-brand-red";

/** Khung trang lỗi / 404 theo giao diện site (chữ Neue Einstellung, label menu). */
export function SiteStatusPage({
  code,
  title,
  description,
  actions,
  className,
}: SiteStatusPageProps) {
  return (
    <section
      className={cn(
        "mx-auto flex min-h-[calc(100dvh-var(--site-header-total-height,0px))] max-w-2xl flex-col items-center justify-center px-[var(--site-header-pad-inline,1.75rem)] py-16 text-center",
        className,
      )}
    >
      <p className="site-label-text uppercase tracking-[0.3em] text-muted-foreground">
        {code}
      </p>
      <h1 className="mt-6 text-2xl uppercase tracking-[0.12em] md:text-3xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {actions ?? (
          <>
            <Link href="/" className={linkClass}>
              Về trang chủ
            </Link>
            <Link href="/projects" className={linkClass}>
              Xem dự án
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export const siteStatusLinkClass = linkClass;
