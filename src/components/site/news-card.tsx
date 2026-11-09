import Link from "next/link";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { formatNewsDate, type NewsListItem } from "@/lib/get-site-news";
import {
  HOME_CARD_FULL_WIDTH,
  HOME_CARD_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";

/* /_next/image chỉ nhận ảnh nội bộ + Supabase (remotePatterns); ảnh og:image
   của trang ngoài hiển thị thẳng, không qua optimizer. */
function isOptimizableCover(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** Thẻ bài tin (thiết kế Tin tức.pdf): ảnh vuông, tiêu đề, mô tả 3 dòng, Đọc thêm + ngày. */
export function NewsCard({
  news,
  eager = false,
}: {
  news: NewsListItem;
  eager?: boolean;
}) {
  const body = (
    <>
      <div className="news-card__cover">
        {news.coverImage && !isOptimizableCover(news.coverImage) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={news.coverImage}
            alt={news.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : news.coverImage ? (
          <ProgressiveImage
            src={news.coverImage}
            alt={news.title}
            previewWidth={HOME_CARD_PREVIEW_WIDTH}
            fullWidth={HOME_CARD_FULL_WIDTH}
            loading={eager ? "eager" : "lazy"}
            className="object-cover"
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          />
        ) : null}
      </div>
      <h2 className="news-card__title ts-heading">{news.title}</h2>
      <p className="news-card__desc ts-body">{news.description}</p>
      <div className="news-card__meta ts-caption">
        <span>Đọc thêm</span>
        <time dateTime={news.publishedAt.toISOString()}>
          {formatNewsDate(news.publishedAt)}
        </time>
      </div>
    </>
  );

  return (
    <article className="news-card">
      {news.externalUrl ? (
        /* Tin link ngoài: mở trang gốc ở tab mới. */
        <a
          href={news.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="news-card__link"
        >
          {body}
        </a>
      ) : (
        <Link href={`/tin-tuc/${news.slug}`} className="news-card__link">
          {body}
        </Link>
      )}
    </article>
  );
}
