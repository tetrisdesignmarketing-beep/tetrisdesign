import {
  MovingLetters,
  MovingLettersPop,
  MovingLettersScale,
} from "@/components/site/moving-letters";
import { cn } from "@/lib/utils";

interface ContentSectionProps {
  title: string;
  paragraphs: readonly string[];
  className?: string;
  movingLetters?: boolean;
  headingEffect?: "ml2";
  bodyEffect?: "text-focus-in";
  movingLettersSectionId?: string;
  /** Ép ml2 play (vd. content-partner đã animate in trên iOS) */
  forceLettersPlay?: boolean;
  bodyClassName?: string;
  scrollBlur?: boolean;
}

export function ContentSection({
  title,
  paragraphs,
  className,
  movingLetters = false,
  headingEffect,
  bodyEffect,
  movingLettersSectionId,
  forceLettersPlay = false,
  bodyClassName,
  scrollBlur = false,
}: ContentSectionProps) {
  const titleNode =
    headingEffect === "ml2" && movingLettersSectionId ? (
      <MovingLettersPop
        text={title}
        sectionId={movingLettersSectionId}
        forcePlay={forceLettersPlay}
      />
    ) : movingLetters ? (
      <MovingLetters text={title} />
    ) : (
      title
    );

  return (
    <section className={cn("py-12", className)}>
      <h2
        data-section-title=""
        data-ml7-heading={movingLetters ? "" : undefined}
        data-ml2-heading={headingEffect === "ml2" ? "" : undefined}
        className="site-label-text uppercase"
      >
        {scrollBlur ? <span data-scroll-blur="">{titleNode}</span> : titleNode}
      </h2>
      <div
        data-section-body=""
        data-ml9-body={movingLetters ? "" : undefined}
        data-text-focus-in={bodyEffect === "text-focus-in" ? "" : undefined}
        data-scroll-blur={scrollBlur ? "" : undefined}
        className={cn("mt-[18px] space-y-4", bodyClassName)}
      >
        {paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {movingLetters ? (
              <MovingLettersScale text={paragraph} />
            ) : (
              paragraph
            )}
          </p>
        ))}
      </div>
    </section>
  );
}
