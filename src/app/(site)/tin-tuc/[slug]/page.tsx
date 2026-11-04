import "@/components/site/news.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/site/news-card";
import { NewsContent } from "@/components/site/news-content";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { SiteFooter } from "@/components/site/site-footer";
import {
  formatNewsDate,
  getNewsBySlug,
  getOtherNews,
} from "@/lib/get-site-news";
import { getSiteContact } from "@/lib/get-site-contact";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { createPageMetadata } from "@/lib/site-metadata";

/** ISR như các trang khác — admin lưu → revalidateSite(). */
export const revalidate = 3600;

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) return createPageMetadata({ title: "Tin tức", path: "/tin-tuc" });
  return createPageMetadata({
    title: news.title,
    description: news.description,
    path: `/tin-tuc/${news.slug}`,
    ...(news.coverImage ? { image: news.coverImage } : {}),
  });
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) notFound();
  const [others, contact] = await Promise.all([
    getOtherNews(news.id),
    getSiteContact(),
  ]);

  return (
    <div className="news-page">
      <article className="news-detail">
        <Link href="/tin-tuc" className="news-detail__back ts-label">
          ← Tin tức
        </Link>
        <h1 className="news-detail__title ts-display">{news.title}</h1>
        <time
          className="news-detail__date ts-caption"
          dateTime={news.publishedAt.toISOString()}
        >
          {formatNewsDate(news.publishedAt)}
        </time>
        {news.description ? (
          <p className="news-detail__lead ts-body">{news.description}</p>
        ) : null}
        {news.coverImage ? (
          <div className="news-detail__cover">
            <ProgressiveImage
              src={news.coverImage}
              alt={news.title}
              previewWidth={CANVAS_PREVIEW_WIDTH}
              fullWidth={CANVAS_FULL_WIDTH}
              fullResponsive
              priority
              className="object-cover"
              sizes="(min-width: 860px) 820px, 100vw"
            />
          </div>
        ) : null}
        <NewsContent blocks={news.content} />
      </article>

      {others.length > 0 ? (
        <section className="news-related" aria-label="Tin khác">
          <h2 className="news-page__title ts-heading">Tin khác</h2>
          <div className="news-grid">
            {others.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter className="news-footer" contact={contact} />
    </div>
  );
}
