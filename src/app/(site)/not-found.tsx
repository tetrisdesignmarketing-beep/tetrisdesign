import type { Metadata } from "next";
import { SiteStatusPage } from "@/components/site/site-status-page";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false, follow: false },
};

/** notFound() trong các trang public (vd. dự án không tồn tại) — có header site. */
export default function SiteNotFound() {
  return (
    <SiteStatusPage
      code="404"
      title="Không tìm thấy trang"
      description="Trang bạn tìm có thể đã được đổi địa chỉ hoặc không còn tồn tại."
    />
  );
}
