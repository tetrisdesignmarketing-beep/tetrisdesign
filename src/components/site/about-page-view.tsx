import { AboutPageScroll } from "@/components/site/about-page-scroll";
import { MediaPlaceholdersProvider } from "@/components/site/media-placeholders";
import { getSiteAbout } from "@/lib/get-site-about";
import { getSiteContact } from "@/lib/get-site-contact";
import {
  getMediaInfoByUrl,
  toMediaPlaceholders,
  type MediaInfo,
} from "@/lib/media-dimensions";
import type { AboutScrollVariant } from "@/lib/about-variant";

function ratioOf(info: MediaInfo | undefined): number | undefined {
  return info?.width && info.height ? info.width / info.height : undefined;
}

/** Trang Giới thiệu dùng chung cho /about, /about1, /about2 (khác biến thể cuộn). */
export async function AboutPageView({
  variant,
}: {
  variant: AboutScrollVariant;
}) {
  const [content, contact] = await Promise.all([
    getSiteAbout(),
    getSiteContact(),
  ]);
  /* 1 truy vấn: ảnh mờ LQIP + kích thước (tỷ lệ khung khi không ghim). Không
     gồm logo đối tác trong suốt. */
  const info = await getMediaInfoByUrl([
    content.heroImage,
    content.brandBreakImage,
  ]);
  return (
    <MediaPlaceholdersProvider value={toMediaPlaceholders(info)}>
      <AboutPageScroll
        content={content}
        contact={contact}
        variant={variant}
        imageRatios={{
          hero: ratioOf(info[content.heroImage]),
          brandBreak: ratioOf(info[content.brandBreakImage]),
        }}
      />
    </MediaPlaceholdersProvider>
  );
}
