"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";
import type { SiteProject } from "@/lib/site-content";
import {
  CARD_FALLBACK_VISIBLE_RATIO,
  CARD_REVEAL_VISIBLE_RATIO,
  getCardVisibleRatio,
  getCurtainScrollRoot,
  isCardFullyOnScreen,
  isCardSubstantiallyVisible,
} from "@/lib/home-scroll";
import { readProjectCoverFadeMs } from "@/lib/wait-site-loading-idle";
import { ProjectCard } from "@/components/site/project-card";
import { cn } from "@/lib/utils";

const CURTAIN_DURATION_MS = 2000;
const CURTAIN_FALLBACK_MS = 2500;

interface HomeProjectCurtainCardProps {
  project: SiteProject;
  sectionReady: boolean;
  headerOffset: number;
  reduceMotion: boolean;
  variant?: "default" | "home" | "gallery";
  /** `immediate` = /projects: cả lưới cùng trigger sau loading */
  gate?: "anchor" | "immediate";
  enterTogether?: boolean;
  image?: string;
  className?: string;
}

export function HomeProjectCurtainCard({
  project,
  sectionReady,
  headerOffset,
  reduceMotion,
  variant = "home",
  gate = "anchor",
  enterTogether = false,
  image,
  className,
}: HomeProjectCurtainCardProps) {
  const slotRef = useRef<HTMLLIElement>(null);
  const playOnLoad = gate === "immediate";
  const revealedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const isHome = variant === "home";
  const playCover = isHome || playOnLoad;

  const reveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
  };

  useEffect(() => {
    if (playCover) {
      const touchUi =
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(max-width: 767px)").matches;
      if (reduceMotion || touchUi) {
        revealedRef.current = true;
        setRevealed(true);
        setCoverGone(true);
        return;
      }
      if (playOnLoad) {
        if (enterTogether) reveal();
        return;
      }
      if (enterTogether && sectionReady) reveal();
      return;
    }

    if (reduceMotion) {
      revealedRef.current = true;
      setRevealed(true);
      return;
    }

    const el = slotRef.current;
    if (!el || !sectionReady || revealedRef.current) return;

    const scrollRoot = getCurtainScrollRoot(el);

    const tryReveal = () => {
      if (isHome) {
        if (getCardVisibleRatio(el, headerOffset, scrollRoot) > 0) {
          reveal();
        }
        return;
      }
      if (
        isCardFullyOnScreen(
          el,
          headerOffset,
          CARD_REVEAL_VISIBLE_RATIO,
          scrollRoot,
        )
      ) {
        reveal();
      }
    };

    tryReveal();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (isHome || entry.intersectionRatio >= CARD_REVEAL_VISIBLE_RATIO) {
          tryReveal();
          if (revealedRef.current) observer.disconnect();
        }
      },
      {
        root: scrollRoot,
        threshold: isHome
          ? [0, 0.05, 0.15, 0.3]
          : [0, 0.5, 0.75, CARD_REVEAL_VISIBLE_RATIO, 1],
        rootMargin: scrollRoot ? "0px" : `-${headerOffset}px 0px 0px 0px`,
      },
    );

    observer.observe(el);

    const onScroll = () => tryReveal();
    if (scrollRoot) {
      scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("scrollend", onScroll, { passive: true });
    }
    window.addEventListener("resize", onScroll, { passive: true });

    const fallbackTimer = window.setTimeout(() => {
      if (revealedRef.current) return;
      if (isHome && sectionReady) {
        reveal();
        observer.disconnect();
        return;
      }
      if (
        !isHome &&
        isCardSubstantiallyVisible(
          el,
          headerOffset,
          CARD_FALLBACK_VISIBLE_RATIO,
          scrollRoot,
        )
      ) {
        reveal();
        observer.disconnect();
      }
    }, isHome ? 200 : CURTAIN_FALLBACK_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
      if (scrollRoot) {
        scrollRoot.removeEventListener("scroll", onScroll);
      } else {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("scrollend", onScroll);
      }
      window.removeEventListener("resize", onScroll);
    };
  }, [
    sectionReady,
    headerOffset,
    reduceMotion,
    variant,
    isHome,
    playOnLoad,
    playCover,
    enterTogether,
  ]);

  const hoverScale = variant !== "gallery";

  useEffect(() => {
    if (!revealed || coverGone || reduceMotion) return;
    const ms = readProjectCoverFadeMs(slotRef.current) + 50;
    const id = window.setTimeout(() => setCoverGone(true), ms);
    return () => window.clearTimeout(id);
  }, [revealed, coverGone, reduceMotion]);

  const onCoverAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    setCoverGone(true);
  };

  return (
    <li
      ref={slotRef}
      className={cn("relative", hoverScale && "project-card-hover-scale", className)}
    >
      <div className="relative">
        <ProjectCard
          project={project}
          variant={variant}
          image={image}
          progressive
        />
        {playCover ? (
          <div
            aria-hidden
            className={cn(
              "home-project-card-cover",
              revealed && "home-project-card-cover--fade",
              (coverGone || reduceMotion) && "home-project-card-cover--gone",
            )}
            onAnimationEnd={onCoverAnimationEnd}
          />
        ) : null}
        {!isHome && !playOnLoad && (
          <div
            aria-hidden
            className={cn(
              "home-project-card-curtain",
              revealed && "home-project-card-curtain--reveal",
            )}
            style={
              revealed
                ? ({
                    "--curtain-duration": `${CURTAIN_DURATION_MS}ms`,
                  } as React.CSSProperties)
                : undefined
            }
          />
        )}
      </div>
    </li>
  );
}
