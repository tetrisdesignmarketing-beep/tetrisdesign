"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteProject } from "@/lib/site-content";
import {
  getHeaderOffset,
  isHomeProjectScrollGateOpen,
} from "@/lib/home-scroll";
import {
  PROJECT_ENTER_FAILSAFE_MS,
  readProjectEnterDelayMs,
  waitUntilSiteLoadingIdle,
} from "@/lib/wait-site-loading-idle";
import { HomeProjectCurtainCard } from "@/components/site/home-project-curtain-card";
import { cn } from "@/lib/utils";

export type ProjectCurtainItem = {
  key: string;
  project: SiteProject;
  image?: string;
};

interface HomeProjectCurtainListProps {
  projects?: SiteProject[];
  items?: ProjectCurtainItem[];
  sectionId?: string;
  className?: string;
  cardVariant?: "default" | "home" | "gallery";
  /** `anchor` = Home: lần đầu scrollY ≥ 50vh; `immediate` = chỉ chờ card lộ */
  gate?: "anchor" | "immediate";
}

export function HomeProjectCurtainList({
  projects = [],
  items,
  sectionId = "home-projects",
  className,
  cardVariant = "home",
  gate = "anchor",
}: HomeProjectCurtainListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const sectionReadyRef = useRef(false);
  const [sectionReady, setSectionReady] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(91);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [enterTogether, setEnterTogether] = useState(false);

  const latchSection = useCallback(() => {
    if (sectionReadyRef.current) return;
    sectionReadyRef.current = true;
    setSectionReady(true);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const touchUi =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches;
    setReduceMotion(reduced);
    setHeaderOffset(getHeaderOffset());
    if (reduced || touchUi) {
      setEnterTogether(true);
      latchSection();
    }
  }, [gate, latchSection]);

  useEffect(() => {
    if (reduceMotion) return;
    const list = listRef.current;
    let timer = 0;
    const stopWait = waitUntilSiteLoadingIdle(() => {
      const delay = readProjectEnterDelayMs(list);
      timer = window.setTimeout(() => setEnterTogether(true), delay);
    });
    const failsafe = window.setTimeout(
      () => setEnterTogether(true),
      PROJECT_ENTER_FAILSAFE_MS,
    );
    return () => {
      stopWait();
      window.clearTimeout(timer);
      window.clearTimeout(failsafe);
    };
  }, [reduceMotion]);

  useEffect(() => {
    const syncOffset = () => setHeaderOffset(getHeaderOffset());
    syncOffset();

    if (reduceMotion || gate === "immediate") {
      latchSection();
    }

    if (reduceMotion) return;

    if (gate === "immediate") {
      window.addEventListener("resize", syncOffset, { passive: true });
      return () => window.removeEventListener("resize", syncOffset);
    }

    const section =
      document.getElementById(sectionId) ??
      listRef.current?.closest("section");

    const tryLatch = () => {
      syncOffset();
      if (isHomeProjectScrollGateOpen(section)) latchSection();
    };

    tryLatch();
    window.addEventListener("scroll", tryLatch, { passive: true });
    window.addEventListener("scrollend", tryLatch, { passive: true });
    window.addEventListener("resize", tryLatch, { passive: true });
    window.visualViewport?.addEventListener("resize", tryLatch);
    window.visualViewport?.addEventListener("scroll", tryLatch);

    return () => {
      window.removeEventListener("scroll", tryLatch);
      window.removeEventListener("scrollend", tryLatch);
      window.removeEventListener("resize", tryLatch);
      window.visualViewport?.removeEventListener("resize", tryLatch);
      window.visualViewport?.removeEventListener("scroll", tryLatch);
    };
  }, [sectionId, reduceMotion, latchSection, gate]);

  const list =
    items ??
    projects.map<ProjectCurtainItem>((project) => ({
      key: project.slug,
      project,
    }));

  return (
    <ul
      ref={listRef}
      data-project-cover=""
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10",
        cardVariant === "gallery" && "lg:grid-cols-4",
        className,
      )}
    >
      {list.map((item, index) => (
          <HomeProjectCurtainCard
            key={item.key}
            project={item.project}
            image={item.image}
            variant={cardVariant}
            gate={gate}
            enterTogether={enterTogether}
            sectionReady={sectionReady}
            headerOffset={headerOffset}
            reduceMotion={reduceMotion}
            className={
              cardVariant === "home" && list.length === 9 && index === 8
                ? "hidden md:block"
                : undefined
            }
          />
        ))}
    </ul>
  );
}
