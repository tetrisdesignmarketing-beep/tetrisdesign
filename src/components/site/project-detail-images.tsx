"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ProjectDetailLightbox } from "@/components/site/project-detail-lightbox";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { onWidthResize } from "@/lib/scroll-trigger-resize";
import {
  HOME_CARD_FULL_WIDTH,
  HOME_CARD_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface ProjectDetailImagesProps {
  images: string[];
  title: string;
  /** Ảnh mờ siêu nhỏ theo URL (Media.placeholder) → ô ảnh không bao giờ trống. */
  placeholders?: Record<string, string>;
  className?: string;
}

/** Nền ảnh mờ (LQIP) cho khung ảnh — hiện ngay trong HTML trước khi ảnh tải. */
function placeholderStyle(placeholder: string | undefined): CSSProperties {
  return placeholder
    ? { backgroundImage: `url("${placeholder.replace(/"/g, "%22")}")` }
    : {};
}


const MARQUEE_REPEAT = 8;

function isLeftOfViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.left + rect.width / 2 < window.innerWidth / 2;
}

export function ProjectDetailImages({
  images,
  title,
  placeholders,
  className,
}: ProjectDetailImagesProps) {
  const rootRef = useRef<HTMLElement>(null);
  /* Ô ảnh trong lưới — để ảnh lightbox bay ra/về đúng chỗ (kiểu iOS). */
  const getOriginElement = useCallback(
    (index: number) =>
      rootRef.current?.querySelectorAll<HTMLElement>("[data-detail-imgwrap]")[
        index
      ] ?? null,
    [],
  );
  const reduced = usePrefersReducedMotion();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setViewportWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || images.length === 0) return;

    gsap.registerPlugin(ScrollTrigger);
    /* iPhone: thanh địa chỉ thu/giãn khi cuộn không được làm GSAP đo lại trang. */
    ScrollTrigger.config({ ignoreMobileResize: true });

    const ctx = gsap.context(() => {
      const grid = root.querySelector<HTMLElement>("[data-detail-grid]");
      const mark = root.querySelector<HTMLElement>("[data-detail-mark]");
      if (!grid) return;

      const wraps = root.querySelectorAll<HTMLElement>("[data-detail-imgwrap]");

      wraps.forEach((imageWrap) => {
        const shadeEl = imageWrap.querySelector<HTMLElement>(
          "[data-detail-shade]",
        );
        const imgEl = imageWrap.querySelector<HTMLElement>("[data-detail-img]");
        const left = isLeftOfViewport(imageWrap);

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: imageWrap,
            start: "top bottom+=10%",
            end: "bottom top-=25%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        /* 3D transform trên wrap — không gắn filter ở đây */
        timeline.fromTo(
          imageWrap,
          {
            z: 300,
            rotateX: 70,
            rotateZ: left ? 5 : -5,
            xPercent: left ? -40 : 40,
            skewX: left ? -20 : 20,
            yPercent: 80,
          },
          {
            z: 0,
            rotateX: 0,
            rotateZ: 0,
            xPercent: 0,
            skewX: 0,
            yPercent: 0,
            ease: "sine",
            duration: 1,
          },
        );

        timeline.to(imageWrap, {
          z: 280,
          rotateX: -50,
          rotateZ: left ? -1 : 1,
          xPercent: left ? -20 : 20,
          skewX: left ? 10 : -10,
          ease: "sine.in",
          duration: 1,
        });

        /* Tối dần khi vào/ra bằng lớp phủ đen + opacity (GPU compositing).
           Trước đây animate `filter: blur() brightness() contrast()` mỗi khung
           hình → vẽ lại từng ảnh khi cuộn, nguồn giật chính trên iPhone. */
        if (shadeEl) {
          timeline.fromTo(
            shadeEl,
            { opacity: 0.65 },
            { opacity: 0, ease: "sine", duration: 1 },
            0,
          );
          timeline.to(
            shadeEl,
            { opacity: 0.65, ease: "sine.in", duration: 1 },
            ">",
          );
        }

        if (imgEl) {
          timeline.fromTo(
            imgEl,
            { scaleY: 1.8 },
            { scaleY: 1, ease: "sine", duration: 1 },
            0,
          );
          timeline.to(imgEl, { scaleY: 1.8, ease: "sine.in", duration: 1 }, 1);
        }
      });

      if (mark) {
        gsap.fromTo(
          mark,
          { x: "100vw" },
          {
            x: "-100%",
            ease: "sine",
            scrollTrigger: {
              trigger: grid,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      }
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const raf = window.requestAnimationFrame(refresh);
    const stopWidthResize = onWidthResize(refresh);

    return () => {
      window.cancelAnimationFrame(raf);
      stopWidthResize();
      ctx.revert();
    };
  }, [images, reduced, viewportWidth]);

  if (images.length === 0) return null;

  const marqueeItems = Array.from({ length: MARQUEE_REPEAT }, (_, index) => (
    <span key={`${title}-${index}`}>{title}</span>
  ));

  return (
    <section
      ref={rootRef}
      className={cn("project-detail-images", className)}
      aria-label="Ảnh dự án"
    >
      <div className="project-detail-images__veil" aria-hidden />

      <div className="project-detail-images__mark" aria-hidden>
        {reduced ? (
          <p className="project-detail-images__mark-static">{title}</p>
        ) : (
          <div className="project-detail-images__mark-clip">
            <div data-detail-mark className="project-detail-images__mark-track">
              {marqueeItems}
            </div>
          </div>
        )}
      </div>

      <div data-detail-grid className="project-detail-grid">
        {images.map((src, index) => (
          <figure key={`${src}-${index}`} className="project-detail-grid__item">
            <button
              type="button"
              data-detail-imgwrap
              className="project-detail-grid__imgwrap"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Xem ${title} — ${String(index + 1).padStart(2, "0")}`}
            >
              <div data-detail-fx className="project-detail-grid__fx">
                <div
                  data-detail-img
                  className="project-detail-grid__img"
                  style={placeholderStyle(placeholders?.[src])}
                >
                  <ProgressiveImage
                    src={src}
                    alt={`${title} — ${index + 1}`}
                    previewWidth={HOME_CARD_PREVIEW_WIDTH}
                    fullWidth={HOME_CARD_FULL_WIDTH}
                    fade={false}
                    loading={index < 8 ? "eager" : "lazy"}
                    sizes="(max-width: 1023px) 45vw, 180px"
                    className="site-image--pop-hover object-cover"
                  />
                </div>
                {/* Lớp tối mờ dần khi ảnh vào/ra (GSAP opacity) */}
                <span
                  data-detail-shade
                  className="project-detail-grid__shade"
                  aria-hidden
                />
              </div>
            </button>
          </figure>
        ))}
      </div>

      <ProjectDetailLightbox
        images={images}
        title={title}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        getOriginElement={getOriginElement}
      />
    </section>
  );
}
