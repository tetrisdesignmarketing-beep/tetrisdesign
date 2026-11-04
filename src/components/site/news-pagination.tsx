import Link from "next/link";

function pageHref(page: number) {
  return page <= 1 ? "/tin-tuc" : `/tin-tuc?page=${page}`;
}

/** Trang hiển thị: tối đa 4 số quanh trang hiện tại + "…" + trang cuối. */
function visiblePages(current: number, total: number): Array<number | "gap"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(current - 1, total - 3));
  const pages: Array<number | "gap"> = [];
  if (start > 1) pages.push(1, "gap");
  for (let page = start; page < start + 4 && page <= total; page += 1) {
    pages.push(page);
  }
  if (start + 4 <= total) pages.push("gap", total);
  return pages;
}

export function NewsPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="news-pagination ts-label" aria-label="Phân trang tin tức">
      {visiblePages(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="news-pagination__gap" aria-hidden>
            ....
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(item)}
            className="news-pagination__page"
            aria-current={item === page ? "page" : undefined}
          >
            {String(item).padStart(2, "0")}
          </Link>
        ),
      )}
    </nav>
  );
}
