"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useFullPageScrollOptional } from "@/lib/full-page-scroll/context";
import { cn } from "@/lib/utils";

interface MovingLettersProps {
  text: string;
  className?: string;
}

function countLetters(text: string) {
  return Array.from(text).filter((char) => !/\s/.test(char)).length;
}

function splitWords(
  text: string,
  renderLetter: (char: string, letterIndex: number) => ReactNode,
  startIndex = 0,
) {
  let letterIndex = startIndex;

  return text.split(/(\s+)/).map((part, partIndex) => {
    if (!part || /^\s+$/.test(part)) {
      return <span key={`${startIndex}-${partIndex}`}>{part}</span>;
    }

    return (
      <span key={`${startIndex}-${partIndex}`} className="ml-word">
        {Array.from(part).map((char) => renderLetter(char, letterIndex++))}
      </span>
    );
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Play khi element nằm trong vùng nhìn thấy của inner scroll. */
function useMovingLettersInView(sectionId: string, forcePlay = false) {
  /* Không có FullPageScrollRoot (vd. About sau khi bỏ full-page-scroll) → luôn
     coi là "ready", chỉ dựa vào IntersectionObserver/scroll bên dưới để play. */
  const context = useFullPageScrollOptional();
  const index = context
    ? context.pager.sections.findIndex((section) => section.id === sectionId)
    : -1;
  const motion =
    context && index >= 0 ? context.getPanelMotionState(index) : "inactive";
  const ready = context ? motion === "active" || motion === "entering" : true;
  const nodeRef = useRef<HTMLElement | null>(null);
  /* forcePlay là derived-state (OR với internalPlay) thay vì set qua effect —
     tránh setState đồng bộ ngay đầu effect (react-hooks/set-state-in-effect). */
  const [internalPlay, setInternalPlay] = useState(false);
  const play = forcePlay || internalPlay;

  const setRef = (node: HTMLElement | null) => {
    nodeRef.current = node;
  };

  useEffect(() => {
    if (forcePlay) return;
    if (!ready) return;
    const el = nodeRef.current;
    if (!el) return;

    let started = false;
    const scroller = el.closest("[data-fps-inner-scroll]");

    const isVisible = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      /* Chỉ clip theo inner scroller — không dùng window.innerHeight (iOS URL bar). */
      const clip =
        scroller instanceof HTMLElement
          ? scroller.getBoundingClientRect()
          : null;
      const top = Math.max(rect.top, clip?.top ?? Number.NEGATIVE_INFINITY);
      const bottom = Math.min(
        rect.bottom,
        clip?.bottom ?? Number.POSITIVE_INFINITY,
      );
      return bottom - top > 8;
    };

    const tryStart = () => {
      if (started || !isVisible()) return;
      started = true;
      setInternalPlay(true);
    };

    tryStart();
    scroller?.addEventListener("scroll", tryStart, { passive: true });
    window.addEventListener("resize", tryStart);
    const observer = new IntersectionObserver(tryStart, { threshold: 0 });
    observer.observe(el);

    return () => {
      scroller?.removeEventListener("scroll", tryStart);
      window.removeEventListener("resize", tryStart);
      observer.disconnect();
    };
  }, [ready, forcePlay]);

  return { setRef, play };
}

const ML2_STAGGER_MS = 70;

interface MovingLettersSectionProps extends MovingLettersProps {
  sectionId: string;
  forcePlay?: boolean;
}

/** Moving Letters #2 — scale 4→1 + fade in, stagger, play once.
 *  https://tobiasahlin.com/moving-letters/#2 */
export function MovingLettersPop({
  text,
  className,
  sectionId,
  forcePlay = false,
}: MovingLettersSectionProps) {
  const { setRef, play } = useMovingLettersInView(sectionId, forcePlay);
  const chars = Array.from(text);
  let letterIndex = 0;

  return (
    <span
      ref={setRef}
      data-ml2=""
      data-ml2-play={play ? "" : undefined}
      className={cn("ml2", className)}
    >
      {chars.map((char, index) => {
        if (/\s/.test(char)) {
          return <span key={index}>{char}</span>;
        }

        const i = letterIndex++;
        return (
          <span
            key={index}
            className="ml2-letter"
            style={
              {
                "--ml2-delay": `${i * ML2_STAGGER_MS}ms`,
              } as CSSProperties
            }
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

/** Moving Letters #7 — wrap từng ký tự để CSS stagger rotateZ. */
export function MovingLetters({ text, className }: MovingLettersProps) {
  const { setRef, play } = useMovingLettersInView("about-hero");
  const chars = Array.from(text);
  let letterIndex = 0;

  return (
    <span
      ref={setRef}
      data-ml7=""
      data-ml7-play={play ? "" : undefined}
      className={cn("ml7", className)}
    >
      <span className="ml7-text-wrapper">
        <span className="ml7-letters">
          {chars.map((char, index) => {
            if (/\s/.test(char)) {
              return <span key={index}>{char}</span>;
            }

            const i = letterIndex++;
            return (
              <span
                key={index}
                className="ml7-letter"
                style={
                  {
                    "--ml7-delay": `${i * 50}ms`,
                  } as CSSProperties
                }
              >
                {char}
              </span>
            );
          })}
        </span>
      </span>
    </span>
  );
}

const ML9_STAGGER_MS = 45;
const ML9_STAGGER_SPAN_MS = 1500;

/** Moving Letters #9 — scale 0→1 + elastic, origin đáy chữ. */
export function MovingLettersScale({ text, className }: MovingLettersProps) {
  const { setRef, play } = useMovingLettersInView("about-hero");
  const letterCount = countLetters(text);
  const staggerMs =
    letterCount > 1
      ? Math.min(ML9_STAGGER_MS, ML9_STAGGER_SPAN_MS / (letterCount - 1))
      : ML9_STAGGER_MS;

  return (
    <span
      ref={setRef}
      data-ml9=""
      data-ml9-play={play ? "" : undefined}
      className={cn("ml9", className)}
    >
      <span className="ml9-text-wrapper">
        <span className="ml9-letters">
          {splitWords(text, (char, i) => (
            <span
              key={`${i}-${char}`}
              className="ml9-letter"
              style={
                {
                  "--ml9-delay": `${(i + 1) * staggerMs}ms`,
                } as CSSProperties
              }
            >
              {char}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

const ML11_LETTER_START_MS = 725;
const ML11_LETTER_STAGGER_MS = 34;
const ML11_EASE = "cubic-bezier(0.19, 1, 0.22, 1)";

/** Moving Letters #11 — line scaleY + quét ngang, chữ fade in. */
export function MovingLettersLine({ text, className }: MovingLettersProps) {
  const { setRef, play } = useMovingLettersInView("about-hero");
  const lineRef = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!play) return;
    if (prefersReducedMotion()) return;

    const line = lineRef.current;
    const wrapper = line?.parentElement;
    const letterEls = lettersRef.current?.querySelectorAll<HTMLElement>(
      ".ml11-letter",
    );
    if (!line || !wrapper || !letterEls?.length) return;

    const width = wrapper.offsetWidth;
    const animations: Animation[] = [
      line.animate(
        [
          { opacity: 0.5, transform: "scaleY(0)", left: "0px" },
          { opacity: 1, transform: "scaleY(1)", left: "0px", offset: 700 / 1700 },
          { opacity: 1, transform: "scaleY(1)", left: "0px", offset: 800 / 1700 },
          {
            opacity: 1,
            transform: "scaleY(1)",
            left: `${Math.max(width - 2, 0)}px`,
            offset: 1500 / 1700,
          },
          {
            opacity: 0,
            transform: "scaleY(1)",
            left: `${Math.max(width - 2, 0)}px`,
          },
        ],
        { duration: 1700, easing: ML11_EASE, fill: "forwards" },
      ),
    ];

    letterEls.forEach((letter, i) => {
      animations.push(
        letter.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 600,
          delay: ML11_LETTER_START_MS + ML11_LETTER_STAGGER_MS * (i + 1),
          easing: ML11_EASE,
          fill: "forwards",
        }),
      );
    });

    return () => {
      animations.forEach((animation) => animation.cancel());
    };
  }, [play]);

  return (
    <span
      ref={setRef}
      data-ml11=""
      data-ml11-play={play ? "" : undefined}
      className={cn("ml11", className)}
    >
      <span className="ml11-text-wrapper">
        <span ref={lineRef} className="ml11-line" aria-hidden />
        <span ref={lettersRef} className="ml11-letters">
          {splitWords(text, (char, i) => (
            <span key={`${i}-${char}`} className="ml11-letter">
              {char}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

const ML16_DURATION_MS = 1400;
const ML16_STAGGER_MS = 30;
const ML16_STAGGER_SPAN_MS = 900;
const ML16_EASE = "cubic-bezier(0.19, 1, 0.22, 1)";

interface AwardItemProps {
  year: number;
  title: string;
}

/** Moving Letters #16 — chữ rơi từ trên xuống, overflow clip. */
export function AwardItem({ year, title }: AwardItemProps) {
  const { setRef, play } = useMovingLettersInView("about-hero");
  const lettersRef = useRef<HTMLSpanElement>(null);
  const yearText = String(year);
  const letterCount = countLetters(`${yearText} — ${title}`);
  const staggerMs =
    letterCount > 1
      ? Math.min(ML16_STAGGER_MS, ML16_STAGGER_SPAN_MS / (letterCount - 1))
      : ML16_STAGGER_MS;

  useEffect(() => {
    if (!play) return;
    if (prefersReducedMotion()) return;

    const letterEls = lettersRef.current?.querySelectorAll<HTMLElement>(
      ".ml16-letter",
    );
    if (!letterEls?.length) return;

    const animations = [...letterEls].map((letter, i) =>
      letter.animate(
        [{ transform: "translateY(-1.2em)" }, { transform: "translateY(0)" }],
        {
          duration: ML16_DURATION_MS,
          delay: staggerMs * i,
          easing: ML16_EASE,
          fill: "both",
        },
      ),
    );

    return () => {
      animations.forEach((animation) => animation.cancel());
    };
  }, [play, staggerMs]);

  return (
    <li
      ref={setRef}
      data-ml16=""
      data-ml16-play={play ? "" : undefined}
      className="ml16 text-sm leading-relaxed text-muted-foreground"
    >
      <span ref={lettersRef} className="ml16-letters">
        {splitWords(yearText, (char, i) => (
          <span
            key={`y-${i}-${char}`}
            className="ml16-letter font-medium text-foreground"
          >
            {char}
          </span>
        ))}
        {splitWords(
          " — ",
          (char, i) => (
            <span key={`d-${i}-${char}`} className="ml16-letter">
              {char}
            </span>
          ),
          countLetters(yearText),
        )}
        {splitWords(
          title,
          (char, i) => (
            <span key={`t-${i}-${char}`} className="ml16-letter">
              {char}
            </span>
          ),
          countLetters(`${yearText} — `),
        )}
      </span>
    </li>
  );
}
