import { Suspense } from "react";
import { ChunkErrorRecovery } from "@/components/site/chunk-error-recovery";
import { SiteHeader } from "@/components/site/site-header";
import { SiteJsonLd } from "@/components/site/site-json-ld";
import { SiteLoadingIntro } from "@/components/site/site-loading-intro";
import { SiteLoadingProvider } from "@/components/site/site-loading-context";
import { SitePageReset } from "@/components/site/site-page-reset";
import { getSiteTypography } from "@/lib/get-site-typography";
import { buildTypographyCss } from "@/lib/site-typography";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* Kiểu chữ admin chỉnh (/admin/pages/typography) — chỉ thuộc tính đã đổi;
     rỗng = giữ nguyên thiết kế. Lưu → revalidateSite() làm mới cả layout. */
  const typographyCss = buildTypographyCss(await getSiteTypography());
  return (
    <SiteLoadingProvider>
      {typographyCss ? (
        <style
          id="site-typography"
          dangerouslySetInnerHTML={{ __html: typographyCss }}
        />
      ) : null}
      <SiteJsonLd />
      <ChunkErrorRecovery />
      <SiteLoadingIntro />
      <Suspense fallback={null}>
        <SitePageReset />
      </Suspense>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {/* File tĩnh, không qua bundle Next — About morph vẫn scale khi chunk lỗi */}
      <script src="/morph-pin.js?v=11" defer />
      <script src="/fps-pager.js?v=4" defer />
      <script src="/partners-marquee.js?v=2" defer />
    </SiteLoadingProvider>
  );
}
