"use client";

import { MovingLettersPop } from "@/components/site/moving-letters";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  PARTNER_LOGO_FULL_WIDTH,
  PARTNER_LOGO_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { normalizePartnerHref } from "@/lib/partner-href";
import { cn } from "@/lib/utils";

interface Partner {
  name: string;
  logo: string;
  /** Có link → bấm logo mở tab mới. Trống → không bấm được. */
  href?: string;
}

interface PartnersRowProps {
  title: string;
  partners: readonly Partner[];
  className?: string;
  headingEffect?: "ml2";
  logoEffect?: "text-focus-in";
  lettersSectionId?: string;
  forceLettersPlay?: boolean;
}

const SLIDES_PER_VIEW = 3;
/** Loop + 3 visible cần đủ slide clones — nhân bản khi danh sách ngắn. */
const MIN_LOOP_SLIDES = SLIDES_PER_VIEW * 2;

function buildLoopSlides(partners: readonly Partner[]): Partner[] {
  if (partners.length === 0) return [];
  if (partners.length >= MIN_LOOP_SLIDES) return [...partners];
  const slides: Partner[] = [];
  while (slides.length < MIN_LOOP_SLIDES) {
    slides.push(...partners);
  }
  return slides;
}

/* Equal visual weight: logo height ∝ 1/√(width/height) → same visible area
   whatever the shape (wide logos get shorter, square ones taller). */
const LOGO_SQUARE_SCALE = 0.8;
const LOGO_MIN_SCALE = 0.35;

function logoScaleForRatio(ratio: number) {
  return Math.min(1, Math.max(LOGO_MIN_SCALE, LOGO_SQUARE_SCALE / Math.sqrt(ratio)));
}

/** Reads the logo's natural aspect ratio from whichever layer loads first. */
function useLogoScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(LOGO_SQUARE_SCALE);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = (img: HTMLImageElement) => {
      /* SVG without intrinsic size reports 0 → keep the default. */
      if (!img.naturalWidth || !img.naturalHeight) return;
      setScale(logoScaleForRatio(img.naturalWidth / img.naturalHeight));
    };
    /* `load` doesn't bubble but does go through the capture phase. */
    const onLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) measure(event.target);
    };
    node.addEventListener("load", onLoad, true);
    /* Cached images may have finished before the listener was attached. */
    const frame = window.requestAnimationFrame(() => {
      node.querySelectorAll("img").forEach((img) => {
        if (img.complete) measure(img);
      });
    });
    return () => {
      node.removeEventListener("load", onLoad, true);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return [ref, scale] as const;
}

function PartnerLogo({
  name,
  logo,
  href,
  hidden = false,
}: Partner & { hidden?: boolean }) {
  const [logoRef, logoScale] = useLogoScale();
  const image = (
    <div className="flex h-16 w-full items-center md:h-24 lg:h-28">
      <div
        ref={logoRef}
        className="relative w-full"
        style={{ height: `${logoScale * 100}%` }}
      >
        <ProgressiveImage
          src={logo}
          alt={name}
          previewWidth={PARTNER_LOGO_PREVIEW_WIDTH}
          fullWidth={PARTNER_LOGO_FULL_WIDTH}
          fade={false}
          className="object-contain object-center"
          sizes="(min-width: 1024px) 200px, (min-width: 768px) 160px, 30vw"
        />
      </div>
    </div>
  );

  const url = normalizePartnerHref(href);
  if (!url) return image;

  /* target=_blank → trình duyệt mở tab mới và chuyển sang tab đó.
     draggable=false: tránh kéo-thả link mặc định làm hỏng thao tác kéo
     carousel (xem public/partners-marquee.js). Bản sao (hidden) không nhận
     focus bàn phím. */
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      tabIndex={hidden ? -1 : undefined}
      aria-label={`${name} (mở tab mới)`}
      className="partners-marquee__link"
    >
      {image}
    </a>
  );
}

/* Tương tác (giữ để dừng, vuốt/kéo theo tay, hover dừng) nằm ở file tĩnh
   public/partners-marquee.js — chạy cả khi React chưa/không hydrate. */

export function PartnersRow({
  title,
  partners,
  className,
  headingEffect,
  logoEffect,
  lettersSectionId = "about-brand-break",
  forceLettersPlay = false,
}: PartnersRowProps) {
  const loopSlides = buildLoopSlides(partners);
  /* Marquee CSS thuần (thay Swiper autoplay delay:0 + freeMode + loop).
     Chuỗi autoplay của Swiper sống nhờ JS: chỉ chạy sau khi React hydrate (lần
     đầu vào trang / điện thoại hydrate chậm → đứng yên, chỉ thấy 1 logo vì
     slide chưa init rộng 100%), và dừng hẳn khi 1 transition bị cắt ngang
     (resize khi thanh URL co giãn lúc cuộn tới đáy, đổi tab…) mà không có
     "transitionend" để nối tiếp. Animation CSS chạy ngay từ HTML server, trên
     compositor, không phụ thuộc React/JS, không thể "kẹt". Danh sách nhân đôi,
     track trượt đúng -50% rồi lặp → liền mạch. 1 hàng, 3 logo/khung như cũ. */
  const useMarquee = loopSlides.length > 0;
  const marqueeStyle = {
    /* Swiper cũ: speed 6000ms mỗi slide → giữ đúng tốc độ. */
    "--partners-marquee-duration": `${loopSlides.length * 6}s`,
  } as CSSProperties;

  return (
    <section className={cn("py-12 pb-16", className)}>
      <h2
        data-section-title=""
        data-ml2-heading={headingEffect === "ml2" ? "" : undefined}
        className="ts-heading site-label-text text-center uppercase"
      >
        {headingEffect === "ml2" ? (
          <MovingLettersPop
            text={title}
            sectionId={lettersSectionId}
            forcePlay={forceLettersPlay}
          />
        ) : (
          title
        )}
      </h2>

      {!useMarquee ? null : (
        <div
          data-partners-scroll=""
          suppressHydrationWarning
          className="partners-marquee mt-10 md:mt-12"
        >
          <ul
            data-partners-logos=""
            data-section-body=""
            data-text-focus-in={logoEffect === "text-focus-in" ? "" : undefined}
            aria-label={title}
            className="partners-marquee__track"
            style={marqueeStyle}
          >
            {loopSlides.map((partner, index) => (
              <li
                key={`${partner.name}-${index}`}
                className="partners-marquee__item"
              >
                <PartnerLogo {...partner} />
              </li>
            ))}
            {/* Bản sao cho vòng lặp liền mạch — ẩn khỏi trình đọc màn hình. */}
            {loopSlides.map((partner, index) => (
              <li
                key={`dup-${partner.name}-${index}`}
                aria-hidden="true"
                className="partners-marquee__item"
              >
                <PartnerLogo {...partner} hidden />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
