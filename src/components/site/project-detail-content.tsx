import { cn } from "@/lib/utils";

interface ProjectDetailContentProps {
  concept?: string;
  address?: string;
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
        <p className="site-label-text uppercase tracking-[0.2em] text-muted-foreground">
          {meta}
        </p>
      ) : null}
      <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground md:text-lg">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
