import type { Metadata } from "next";
import Link from "next/link";
import { SiteStatusPage } from "@/components/site/site-status-page";
import { siteBrand } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false, follow: false },
};

/** Đường dẫn không khớp route nào (ngoài layout site → tự thêm tên thương hiệu). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <Link
        href="/"
        className="site-label-text px-[var(--site-header-pad-inline,1.75rem)] pt-8 uppercase tracking-[0.25em]"
      >
        {siteBrand.name}
      </Link>
      <SiteStatusPage
        code="404"
        title="Không tìm thấy trang"
        description="Trang bạn tìm có thể đã được đổi địa chỉ hoặc không còn tồn tại."
        className="flex-1"
      />
    </main>
  );
}
