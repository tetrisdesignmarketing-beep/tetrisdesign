import { Fragment } from "react";
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
            <h3 className="ts-heading text-sm font-bold">{group.title}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-[32px]">
              {group.items.map((item, itemIndex) => (
                <li
                  key={`${item.year}-${itemIndex}`}
                  className="ts-body text-sm leading-relaxed text-muted-foreground"
                >
                  {/* Year always first + bold; parts follow in admin order,
                      joined by a space (admin types its own punctuation). */}
                  <span className="font-bold text-foreground">
                    {item.year}
                  </span>
                  {" — "}
                  {item.parts.map((part, partIndex) => (
                    <Fragment key={partIndex}>
                      {partIndex > 0 ? " " : null}
                      {part.bold ? (
                        <span className="font-bold text-foreground">
                          {part.text}
                        </span>
                      ) : (
                        part.text
                      )}
                    </Fragment>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
