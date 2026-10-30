import { MovingLettersPop } from "@/components/site/moving-letters";
import type { AwardGroup } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface AwardsListProps {
  title: string;
  groups: readonly AwardGroup[];
  className?: string;
  /** Dưới brand break: hiệu ứng giống khối văn bản (ml2 + text-focus-in). */
  headingEffect?: "ml2";
  bodyEffect?: "text-focus-in";
  movingLettersSectionId?: string;
  forceLettersPlay?: boolean;
}

export function AwardsList({
  title,
  groups,
  className,
  headingEffect,
  bodyEffect,
  movingLettersSectionId,
  forceLettersPlay = false,
}: AwardsListProps) {
  const ml2 = headingEffect === "ml2" && Boolean(movingLettersSectionId);
  return (
    <section className={cn("py-12", className)}>
      <h2
        data-section-title=""
        data-ml2-heading={ml2 ? "" : undefined}
        className="ts-heading site-label-text uppercase"
      >
        {ml2 && movingLettersSectionId ? (
          <MovingLettersPop
            text={title}
            sectionId={movingLettersSectionId}
            forcePlay={forceLettersPlay}
          />
        ) : (
          <span data-scroll-blur="">{title}</span>
        )}
      </h2>
      <div
        data-section-body=""
        data-ml11-body=""
        data-text-focus-in={bodyEffect === "text-focus-in" ? "" : undefined}
        className="mt-3 space-y-8"
      >
        {groups.map((group) => (
          <div key={group.title} data-scroll-blur="">
            <h3 className="ts-heading text-sm font-semibold">{group.title}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-[32px]">
              {group.items.map((item) => (
                <li
                  key={`${item.year}-${item.title}`}
                  className="ts-body text-sm leading-relaxed text-muted-foreground"
                >
                  {/* Highlights: year + award name; project stays regular weight. */}
                  <span className="font-semibold text-foreground">
                    {item.year}
                  </span>
                  {" — "}
                  <span className="font-semibold text-foreground">
                    {item.title}
                  </span>
                  {item.project ? ` — ${item.project}` : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
