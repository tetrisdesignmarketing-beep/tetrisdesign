import "@/components/site/news.css";
import { NewsCard } from "@/components/site/news-card";
import { NewsPagination } from "@/components/site/news-pagination";
import { SiteFooter } from "@/components/site/site-footer";
import { getNewsPage } from "@/lib/get-site-news";
import { getSiteContact } from "@/lib/get-site-contact";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Tin tức",
  description: "Tin tức, dự án mới và hoạt động của Tetris Design.",
  path: "/tin-tuc",
});

type NewsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { page: rawPage } = await searchParams;
  const requested = Number.parseInt(
    Array.isArray(rawPage) ? (rawPage[0] ?? "1") : (rawPage ?? "1"),
    10,
  );
  const [{ items, page, totalPages }, contact] = await Promise.all([
    getNewsPage(Number.isFinite(requested) ? requested : 1),
    getSiteContact(),
  ]);

  return (
    <div className="news-page">
      <h1 className="news-page__title ts-heading">Tin tức</h1>
      {items.length === 0 ? (
        <p className="news-empty ts-body">Chưa có bài tin nào.</p>
      ) : (
        <div className="news-grid">
          {items.map((news, index) => (
            <NewsCard key={news.id} news={news} eager={index < 3} />
          ))}
        </div>
      )}
      <NewsPagination page={page} totalPages={totalPages} />
      <SiteFooter className="news-footer" contact={contact} />
    </div>
  );
}
