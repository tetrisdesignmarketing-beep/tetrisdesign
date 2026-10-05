"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  SiteStatusPage,
  siteStatusLinkClass,
} from "@/components/site/site-status-page";

/** Lỗi khi dựng trang public — giữ header site, cho thử lại. */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SiteStatusPage
      code="Lỗi"
      title="Đã có lỗi xảy ra"
      description="Trang chưa tải được. Vui lòng thử lại sau ít phút."
      actions={
        <>
          <button type="button" onClick={reset} className={siteStatusLinkClass}>
            Thử lại
          </button>
          <Link href="/" className={siteStatusLinkClass}>
            Về trang chủ
          </Link>
        </>
      }
    />
  );
}
