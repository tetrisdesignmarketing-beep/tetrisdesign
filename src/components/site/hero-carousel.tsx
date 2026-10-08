"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { CarouselDots } from "@/components/site/carousel-dots";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { useSiteLoading } from "@/components/site/site-loading-context";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import {
  isHeroGestureActive,
  scrollToProjectsAnchor,
  SECTION_AXIS_LOCK_MIN,
  SECTION_SWIPE_MIN,
} from "@/lib/home-scroll";
import type { HeroSlideView } from "@/lib/get-home-hero-slides";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  slides: HeroSlideView[];
  className?: string;
  projectsAnchorId?: string;
}

/** Thời gian mỗi slide hiển thị trước khi tự chuyển. */
const AUTOPLAY_MS = 6000;
const WHEEL_COOLDOWN_MS = 420;
/** Debounce ngắn khi browser chưa có scrollend — tránh flicker giữa 2 slide. */
const SCROLL_INDEX_DEBOUNCE_MS = 50;
/** iOS/Android: sau touch còn synthetic mouse/pointer (~300ms) — chặn để khỏi next 2 slide. */
const GHOST_POINTER_MS = 600;

type Point = { x: number; y: number };

function isControlTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [data-hero-pager], [data-carousel-dots]"))
  );
}

/** iOS fires mouseenter on touch and often never mouseleave — do not pause autoplay */
function canHoverPauseAutoplay() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export function HeroCarousel({
  slides,
  className,
  projectsAnchorId = "home-projects",
}: HeroCarouselProps) {
  const { navigateWithLoading } = useSiteLoading();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<Point | null>(null);
  const axisRef = useRef<"horizontal" | "vertical" | null>(null);
  const touchArmedRef = useRef(false);
  const ignoreClickUntilRef = useRef(0);
  const lastTouchAtRef = useRef(0);
  const wheelLockRef = useRef(0);
  const goToRef = useRef<(index: number) => void>(() => {});
  const activeIndexRef = useRef(0);
  const jumpingRef = useRef(false);
  const jumpTimerRef = useRef(0);
  const scrollIndexTimerRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHeroActive, setIsHeroActive] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  /* Giá trị mới nhất cho handler/timer — gán sau commit, không gán trong render. */
  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const syncSlideWidth = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    section.style.setProperty("--hero-slide-w", `${section.clientWidth}px`);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      const next = (index + slides.length) % slides.length;
      const track = trackRef.current;
      const slide = track?.querySelectorAll<HTMLElement>("[data-hero-slide]")[next];
      setActiveIndex(next);
      if (!track || !slide) return;

      jumpingRef.current = true;
      track.dataset.heroJumping = "";
      window.clearTimeout(jumpTimerRef.current);
      window.clearTimeout(scrollIndexTimerRef.current);
      const left = slide.offsetLeft;
      track.scrollLeft = left;
      requestAnimationFrame(() => {
        track.scrollLeft = left;
        jumpTimerRef.current = window.setTimeout(() => {
          jumpingRef.current = false;
          delete track.dataset.heroJumping;
        }, 80);
      });
    },
    [slides.length],
  );
  useLayoutEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  useEffect(() => {
    const sync = () => {
      const active = isHeroGestureActive();
      setIsHeroActive(active);
      if (active && !canHoverPauseAutoplay()) setIsHovered(false);
    };
    const onOrient = () => {
      sync();
      syncSlideWidth();
    };
    sync();
    syncSlideWidth();
    const section = sectionRef.current;
    const resize = section ? new ResizeObserver(syncSlideWidth) : null;
    if (section && resize) resize.observe(section);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("scrollend", sync, { passive: true });
    window.addEventListener("pageshow", sync);
    window.addEventListener("orientationchange", onOrient);
    window.addEventListener("resize", syncSlideWidth);
    document.addEventListener("visibilitychange", sync);
    return () => {
      resize?.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("scrollend", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("orientationchange", onOrient);
      window.removeEventListener("resize", syncSlideWidth);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [syncSlideWidth]);

  useEffect(() => {
    const clearHover = () => setIsHovered(false);
    window.addEventListener("touchstart", clearHover, { passive: true });
    return () => window.removeEventListener("touchstart", clearHover);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const commitIndexFromScroll = () => {
      if (jumpingRef.current) return;
      const width = track.clientWidth;
      if (width <= 0) return;
      const index = Math.min(
        slides.length - 1,
        Math.max(0, Math.round(track.scrollLeft / width)),
      );
      setActiveIndex(index);
    };

    const onScroll = () => {
      if (jumpingRef.current) return;
      window.clearTimeout(scrollIndexTimerRef.current);
      scrollIndexTimerRef.current = window.setTimeout(
        commitIndexFromScroll,
        SCROLL_INDEX_DEBOUNCE_MS,
      );
    };

    const onScrollEnd = () => {
      window.clearTimeout(scrollIndexTimerRef.current);
      commitIndexFromScroll();
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("scrollend", onScrollEnd);
    return () => {
      window.clearTimeout(scrollIndexTimerRef.current);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("scrollend", onScrollEnd);
    };
  }, [slides.length]);

  /* Mỗi slide hiển thị đủ AUTOPLAY_MS rồi mới chuyển: đếm lại từ đầu mỗi khi
     đổi slide (kể cả người xem tự vuốt/bấm) → không nhảy sớm sau thao tác tay. */
  useEffect(() => {
    if (slides.length <= 1 || !isHeroActive) return;
    if (isHovered && canHoverPauseAutoplay()) return;
    const timer = window.setTimeout(() => {
      goToRef.current(activeIndexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [slides.length, isHovered, isHeroActive, activeIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const markTouch = () => {
      lastTouchAtRef.current = Date.now();
      ignoreClickUntilRef.current = Date.now() + GHOST_POINTER_MS;
    };

    const recentlyTouched = () =>
      Date.now() - lastTouchAtRef.current < GHOST_POINTER_MS;

    const arm = (point: Point) => {
      if (!isHeroGestureActive()) return false;
      originRef.current = point;
      axisRef.current = null;
      return true;
    };

    const finish = (x: number, y: number) => {
      const origin = originRef.current;
      const axis = axisRef.current;
      originRef.current = null;
      axisRef.current = null;
      touchArmedRef.current = false;
      if (!origin) return;

      const deltaX = x - origin.x;
      const deltaY = y - origin.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const resolved = axis ?? (absX >= absY ? "horizontal" : "vertical");
      const isTap = absX < SECTION_SWIPE_MIN && absY < SECTION_SWIPE_MIN;

      ignoreClickUntilRef.current = Date.now() + GHOST_POINTER_MS;

      if (isTap) {
        goToRef.current(activeIndexRef.current + 1);
        return;
      }

      /* Ngang: chỉ native scroll-snap — không goTo (tránh next 2 slide). */
      if (resolved === "horizontal") {
        return;
      }

      /* Vuốt lên (deltaY < 0) → xuống projects. Không chặn native scroll. */
      if (deltaY < 0 && absY >= SECTION_SWIPE_MIN) {
        scrollToProjectsAnchor(projectsAnchorId);
      }
    };

    const lockAxis = (x: number, y: number) => {
      const origin = originRef.current;
      if (!origin) return;
      const absX = Math.abs(x - origin.x);
      const absY = Math.abs(y - origin.y);
      if (!axisRef.current && (absX >= SECTION_AXIS_LOCK_MIN || absY >= SECTION_AXIS_LOCK_MIN)) {
        axisRef.current = absX >= absY ? "horizontal" : "vertical";
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isControlTarget(event.target)) return;
      const touch = event.touches[0];
      markTouch();
      if (!arm({ x: touch.clientX, y: touch.clientY })) return;
      touchArmedRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchArmedRef.current || !originRef.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      lockAxis(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (event: TouchEvent) => {
      markTouch();
      if (!touchArmedRef.current) return;
      const touch = event.changedTouches[0];
      finish(touch.clientX, touch.clientY);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || isControlTarget(event.target)) return;
      /* Ghost mouse sau touch — không arm lại (tránh tap lần 2). */
      if (recentlyTouched()) return;
      if (!arm({ x: event.clientX, y: event.clientY })) return;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !originRef.current) return;
      lockAxis(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !originRef.current) return;
      if (recentlyTouched()) {
        originRef.current = null;
        axisRef.current = null;
        return;
      }
      finish(event.clientX, event.clientY);
    };

    const onClick = (event: MouseEvent) => {
      if (isControlTarget(event.target)) return;
      if (recentlyTouched() || Date.now() < ignoreClickUntilRef.current) {
        event.preventDefault();
        return;
      }
      if (!isHeroGestureActive()) return;
      goToRef.current(activeIndexRef.current + 1);
    };

    const onWheel = (event: WheelEvent) => {
      if (!isHeroGestureActive()) return;
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absX < 8 || absX < absY) return;
      event.preventDefault();
      const now = Date.now();
      if (now < wheelLockRef.current) return;
      wheelLockRef.current = now + WHEEL_COOLDOWN_MS;
      if (event.deltaX > 0) goToRef.current(activeIndexRef.current + 1);
      else goToRef.current(activeIndexRef.current - 1);
    };

    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: true });
    section.addEventListener("touchend", onTouchEnd);
    section.addEventListener("touchcancel", onTouchEnd);
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("pointerup", onPointerUp);
    section.addEventListener("pointercancel", onPointerUp);
    section.addEventListener("click", onClick);
    section.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("touchend", onTouchEnd);
      section.removeEventListener("touchcancel", onTouchEnd);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerup", onPointerUp);
      section.removeEventListener("pointercancel", onPointerUp);
      section.removeEventListener("click", onClick);
      section.removeEventListener("wheel", onWheel);
    };
  }, [projectsAnchorId]);

  if (slides.length === 0) return null;

  const activeSlide = slides[activeIndex] ?? slides[0]!;

  return (
    <section
      ref={sectionRef}
      id="hero-carousel"
      data-home-section="slides"
      data-hero-active={isHeroActive ? "" : undefined}
      className={cn("relative w-full overflow-hidden bg-[#231f20]", className)}
      aria-roledescription="carousel"
      aria-label="Ảnh nổi bật"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && canHoverPauseAutoplay()) {
          setIsHovered(true);
        }
      }}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div ref={trackRef} data-hero-track>
        {slides.map((item, index) => {
          const distance = Math.min(
            Math.abs(index - activeIndex),
            slides.length - Math.abs(index - activeIndex),
          );

          return (
            <div
              key={`${item.mobileImage}-${item.desktopImage}-${index}`}
              data-hero-slide
              aria-hidden={index !== activeIndex}
            >
              <ProgressiveImage
                src={item.mobileImage || item.desktopImage}
                alt={item.title}
                previewWidth={CANVAS_PREVIEW_WIDTH}
                fullWidth={CANVAS_FULL_WIDTH}
                loadPreview={distance <= 1}
                loadFull={distance <= 1}
                persistFull
                priority={index === 0}
                /* 2 ảnh (mobile + desktop, 1 cái bị ẩn) cùng tải → không tải
                   lớp nét song song, tránh tải thừa ảnh lớn của bản bị ẩn. */
                eagerFull={false}
                className="pointer-events-none object-cover md:hidden"
              />
              <ProgressiveImage
                src={item.desktopImage || item.mobileImage}
                alt={item.title}
                previewWidth={CANVAS_PREVIEW_WIDTH}
                fullWidth={CANVAS_FULL_WIDTH}
                loadPreview={distance <= 1}
                loadFull={distance <= 1}
                persistFull
                priority={index === 0}
                /* 2 ảnh (mobile + desktop, 1 cái bị ẩn) cùng tải → không tải
                   lớp nét song song, tránh tải thừa ảnh lớn của bản bị ẩn. */
                eagerFull={false}
                className="pointer-events-none hidden object-cover md:block"
              />
            </div>
          );
        })}
      </div>

      <div data-hero-caption data-hero-pager className="absolute inset-x-0 bottom-0 z-20 px-4 md:px-8">
        {/* Mobile — dots centered only */}
        <div className="md:hidden">
          <CarouselDots
            count={slides.length}
            activeIndex={activeIndex}
            onSelect={goTo}
          />
        </div>

        {/* Desktop — title | dots | CTA */}
        <div className="relative hidden items-center md:flex">
          <div className="z-10 flex min-w-0 flex-1 items-baseline gap-8 pr-8 text-sm font-medium tracking-[var(--tracking-label)] text-white uppercase">
            <span className="truncate">{activeSlide.title}</span>
            <span className="truncate opacity-90">{activeSlide.location}</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="pointer-events-auto">
              <CarouselDots
                count={slides.length}
                activeIndex={activeIndex}
                onSelect={goTo}
              />
            </div>
          </div>

          <div className="z-10 flex flex-1 justify-end pl-8">
            <Link
              href={activeSlide.href}
              onClick={(event) => {
                event.preventDefault();
                navigateWithLoading(activeSlide.href);
              }}
              className="cursor-pointer rounded-full bg-white px-6 py-2.5 text-xs font-medium tracking-[var(--tracking-label)] text-[#231f20] uppercase transition-colors duration-200 ease-out hover:bg-brand-red hover:text-white"
            >
              XEM DỰ ÁN
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
