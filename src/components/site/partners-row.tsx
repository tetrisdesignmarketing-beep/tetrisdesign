"use client";

import { MovingLettersPop } from "@/components/site/moving-letters";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  PARTNER_LOGO_FULL_WIDTH,
  PARTNER_LOGO_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Autoplay, FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";

interface Partner {
  name: string;
  logo: string;
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

function PartnerLogo({ name, logo }: Partner) {
  return (
    <div className="relative h-16 w-full md:h-24 lg:h-28">
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
  );
}

export function PartnersRow({
  title,
  partners,
  className,
  headingEffect,
  logoEffect,
  lettersSectionId = "about-brand-break",
  forceLettersPlay = false,
}: PartnersRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const loopSlides = buildLoopSlides(partners);
  /* Luôn dùng Swiper khi có partner — đảm bảo CHỈ 1 hàng (flex nowrap) trên
     mọi màn hình/thiết bị. Trước đây reduced-motion rơi về <ul grid-cols-3>,
     wrap thành nhiều hàng khi > 3 partner. Tôn trọng reduced-motion bằng cách
     tắt autoplay (không tự trượt) chứ không đổi layout. */
  const useMarquee = loopSlides.length > 0;

  return (
    <section className={cn("py-12 pb-16", className)}>
      <h2
        data-section-title=""
        data-ml2-heading={headingEffect === "ml2" ? "" : undefined}
        className="text-center text-sm font-bold uppercase"
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
          className="partners-marquee mt-10 md:mt-12"
        >
          <Swiper
            modules={[Autoplay, FreeMode]}
            className="w-full"
            wrapperTag="ul"
            slidesPerView={SLIDES_PER_VIEW}
            spaceBetween={24}
            breakpoints={{
              768: { spaceBetween: 64 },
            }}
            loop
            speed={6000}
            allowTouchMove
            simulateTouch
            grabCursor
            freeMode={{
              enabled: true,
              momentum: false,
            }}
            autoplay={
              reducedMotion
                ? false
                : {
                    delay: 0,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: false,
                  }
            }
            watchSlidesProgress
            data-partners-logos=""
            data-section-body=""
            data-text-focus-in={logoEffect === "text-focus-in" ? "" : undefined}
            aria-label={title}
            onTouchEnd={(swiper) => {
              if (!swiper.autoplay.running) swiper.autoplay.start();
            }}
          >
            {loopSlides.map((partner, index) => (
              <SwiperSlide
                key={`${partner.name}-${index}`}
                tag="li"
                className="!flex items-center justify-center"
              >
                <PartnerLogo {...partner} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </section>
  );
}
