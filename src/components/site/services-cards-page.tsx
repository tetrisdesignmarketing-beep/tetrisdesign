"use client";

import {
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  useEffect,
  useRef,
} from "react";
import "./services-cards-page.css";
import { ProgressiveImage } from "@/components/site/progressive-image";
import { SiteFooter } from "@/components/site/site-footer";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { SiteService } from "@/lib/site-content";
import { getSitePageFallback } from "@/lib/site-page-defaults";
import { resolveSocialLinks, toMessengerHref } from "@/lib/social-links";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ServicesCardsPageProps {
  services: readonly SiteService[];
  contact?: ContactPageContent;
}

/** Màu thẻ xen kẽ: thẻ lẻ (1, 3, 5…) xám nhạt, thẻ chẵn (2, 4, 6…) đỏ. */
const CARD_TONES = ["light", "red"] as const;

/** "We turn ideas into spaces" — vị trí ngang từng chữ theo bản desktop 1440. */
const TAGLINE_WORDS = [
  { text: "We", left: "2.5%" },
  { text: "turn", left: "22%" },
  { text: "ideas", left: "67%" },
  { text: "into", left: "81.5%" },
  { text: "spaces", left: null },
] as const;

/** Dòng hero: tên ngắn (admin) hoặc tiêu đề, thêm dấu chấm như thiết kế. */
function heroLabel(service: SiteService) {
  const text = (service.shortTitle?.trim() || service.title.trim()).replace(
    /\s+/g,
    " ",
  );
  /* Không có dấu chấm cuối (kể cả khi admin nhập sẵn). */
  return text.replace(/[.…]+$/, "").trimEnd();
}

function cardAnchor(index: number) {
  return `service-${index + 1}`;
}

/**
 * Hiện dần khi phần tử vào màn hình: IntersectionObserver gắn cờ 1 lần rồi
 * thôi theo dõi — không có JS chạy theo từng khung cuộn, animation do CSS
 * (transform/opacity) chạy trên compositor nên cuộn mượt.
 */
function useRevealOnView(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-svc-reveal]");
    const show = (el: Element) => el.setAttribute("data-svc-in", "");
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      nodes.forEach(show);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rootRef]);
}

/**
 * Layout mặc định /services (admin: "service"): hero 3 dòng tên dịch vụ →
 * "Our Service" cỡ lớn → thẻ dịch vụ (đen / đỏ / xám) → khối liên hệ → footer.
 * Desktop/tablet: thẻ 2 cột (nội dung | ảnh 4:5); mobile: xếp dọc.
 */
export function ServicesCardsPage({ services, contact }: ServicesCardsPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealOnView(rootRef);

  const resolvedContact = contact ?? getSitePageFallback("contact");
  const email = resolvedContact.email.trim();
  const phone = resolvedContact.phone.trim();
  const phoneHref = phone.replace(/[^\d+]/g, "");
  /* "Tư vấn dịch vụ này" → nhắn Messenger Fanpage (link Facebook ở admin
     Liên hệ); chưa có / không đổi được sang m.me → gửi email như cũ. */
  const messengerHref = toMessengerHref(
    resolveSocialLinks(resolvedContact).facebook,
  );
  const lastHeroIndex = Math.max(services.length - 1, 1);

  /* Bấm dòng hero → cuộn mượt tới thẻ (anchor vẫn chạy khi chưa có JS). */
  const onHeroClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    const target = document.getElementById(cardAnchor(index));
    if (!target) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div ref={rootRef} className="svc-page" data-services-cards-page="">
      <section className="svc-hero" aria-label="Lĩnh vực dịch vụ">
        <ul className="svc-hero__list">
          {services.map((service, index) => (
            <li
              key={service.title + index}
              className="svc-hero__item"
              style={
                {
                  "--svc-hero-i": index,
                  /* Đậm → nhạt dần theo thứ tự (thiết kế: #525252 → #dedede). */
                  "--svc-hero-mix": `${Math.round((index / lastHeroIndex) * 100)}%`,
                } as CSSProperties
              }
            >
              <a
                href={`#${cardAnchor(index)}`}
                className="svc-hero__line ts-display"
                onClick={(event) => onHeroClick(event, index)}
              >
                {heroLabel(service)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="svc-intro" aria-label="Our Service">
        <p className="svc-intro__tagline ts-caption" data-svc-reveal="">
          {TAGLINE_WORDS.map((word) => (
            <span
              key={word.text}
              className="svc-intro__word"
              style={
                word.left === null
                  ? undefined
                  : ({ "--svc-word-left": word.left } as CSSProperties)
              }
              data-last={word.left === null ? "" : undefined}
            >
              {word.text}
            </span>
          ))}
        </p>
        <h1 className="svc-intro__title" data-svc-reveal="">
          <span className="svc-intro__title-text">Our Service</span>
        </h1>
      </section>

      <div className="svc-cards">
        {services.map((service, index) => {
          const tone = CARD_TONES[index % CARD_TONES.length];
          const group = service.group?.trim();
          const subject = encodeURIComponent(
            `Tư vấn dịch vụ: ${[group, service.title].filter(Boolean).join(" ")}`,
          );
          return (
            <article
              key={service.title + index}
              id={cardAnchor(index)}
              className="svc-card"
              data-tone={tone}
              data-svc-reveal=""
              aria-labelledby={`${cardAnchor(index)}-title`}
            >
              <div className="svc-card__content">
                <p className="svc-card__num ts-caption" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div className="svc-card__media">
                  <ProgressiveImage
                    src={service.image}
                    alt={service.imageAlt}
                    previewWidth={CANVAS_PREVIEW_WIDTH}
                    fullWidth={CANVAS_FULL_WIDTH}
                    fullResponsive
                    loading="lazy"
                    className="object-cover"
                    sizes="(min-width: 768px) 30vw, 100vw"
                  />
                </div>
                <div className="svc-card__body">
                  <h2
                    id={`${cardAnchor(index)}-title`}
                    className="svc-card__title ts-heading"
                  >
                    {group ? (
                      <span className="svc-card__group">{group}</span>
                    ) : null}
                    <span>{service.title}</span>
                  </h2>
                  <p className="svc-card__desc ts-body">{service.description}</p>
                </div>
                {messengerHref ? (
                  <a
                    href={messengerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="svc-card__cta ts-label"
                    aria-label={`Tư vấn dịch vụ ${service.title} qua Messenger (mở tab mới)`}
                  >
                    Tư vấn dịch vụ này
                  </a>
                ) : email ? (
                  <a
                    href={`mailto:${email}?subject=${subject}`}
                    className="svc-card__cta ts-label"
                  >
                    Tư vấn dịch vụ này
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <section className="svc-contact" aria-label="Liên hệ">
        <p className="svc-contact__heading ts-heading" data-svc-reveal="">
          Bắt đầu dự án cùng
          <br />
          Tetris.
        </p>
        <div className="svc-contact__links" data-svc-reveal="">
          {email ? (
            <a href={`mailto:${email}`} className="svc-contact__link ts-body">
              {email}
            </a>
          ) : null}
          {phone ? (
            <a href={`tel:${phoneHref}`} className="svc-contact__link ts-body">
              {phone}
            </a>
          ) : null}
        </div>
      </section>

      <SiteFooter className="svc-footer" contact={resolvedContact} />
    </div>
  );
}
