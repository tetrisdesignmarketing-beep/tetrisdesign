import type { ProjectFact } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface ProjectDetailContentProps {
  concept?: string;
  address?: string;
  /** Vị trí / Diện tích / Năm thiết kế / Kiến trúc sư — xem getProjectFacts. */
  facts?: ProjectFact[];
  description: string;
  className?: string;
}

/**
 * Mô tả nhập từ textarea admin giữ nguyên ký tự xuống dòng (\n), nhưng HTML
 * gộp mọi khoảng trắng/xuống dòng thành 1 dấu cách. Tách theo dòng trống thành
 * từng đoạn <p>; xuống dòng đơn trong 1 đoạn giữ lại bằng `whitespace-pre-line`.
 */
function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ProjectDetailContent({
  concept,
  address,
  facts = [],
  description,
  className,
}: ProjectDetailContentProps) {
  const meta = [concept, address].filter(Boolean).join(" | ");
  const paragraphs = splitParagraphs(description);

  return (
    <section
      className={cn(
        "mx-auto max-w-3xl px-4 py-[min(20vh,8rem)] text-center",
        className,
      )}
    >
      {meta ? (
        <p className="ts-label site-label-text uppercase tracking-[var(--tracking-label)] text-muted-foreground">
          {meta}
        </p>
      ) : null}
      {facts.length > 0 ? (
        /* Căn trái: mobile `.ts-body` căn đều làm giá trị lệch nhãn (nhãn giữa). */
        <dl className="mt-8 grid grid-cols-2 text-left gap-x-6 gap-y-6 border-y border-border py-6 md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="ts-caption site-label-text uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="ts-body mt-2 break-words text-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="ts-body mt-6 space-y-4 text-base leading-relaxed text-foreground md:text-lg">
        {paragraphs.map((paragraph, index) => (
          /* Desktop căn đều 2 bên như mobile (globals.css `.ts-body` < 1024px). */
          <p key={index} className="whitespace-pre-line lg:text-justify">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
