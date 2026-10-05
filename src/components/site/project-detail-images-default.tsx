"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ProjectDetailLightbox } from "@/components/site/project-detail-lightbox";
import { ProgressiveImage } from "@/components/site/progressive-image";
import type { MediaDimensions } from "@/lib/media-dimensions";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";
import {
  buildRows,
  gallerySizes,
  isPortrait,
  pairShareOf,
  type GalleryItem,
} from "@/lib/project-gallery-rows";

interface ProjectDetailImagesDefaultProps {
  images: string[];
  title: string;
  /** Ảnh mờ siêu nhỏ theo URL (Media.placeholder) → khung không bao giờ trống. */
  placeholders?: Record<string, string>;
  /** Kích thước thật theo URL (server tra từ Media). Thiếu → đo ở trình duyệt. */
  dimensions?: Record<string, MediaDimensions>;
  className?: string;
}

const EAGER_COUNT = 4;
/** Nền ảnh mờ (LQIP) cho khung ảnh — hiện ngay trong HTML trước khi ảnh tải. */
function placeholderStyle(placeholder: string | undefined): CSSProperties {
  return placeholder
    ? { backgroundImage: `url("${placeholder.replace(/"/g, "%22")}")` }
    : {};
}

/** Gallery LAYOUTDEFAULT — cursor mắt khi hover, lightbox như LAYOUT1. */
export function ProjectDetailImagesDefault({
  images,
  title,
  dimensions,
  placeholders,
  className,
}: ProjectDetailImagesDefaultProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  /* Nút ảnh theo thứ tự lightbox — để ảnh bay ra/về đúng ô (kiểu iOS). */
  const triggerRefs = useRef(new Map<number, HTMLElement>());
  const getOriginElement = useCallback(
    (index: number) => triggerRefs.current.get(index) ?? null,
    [],
  );
  /* Tỷ lệ đo được ở trình duyệt cho ảnh không có trong Media (theo vị trí). */
  const [measured, setMeasured] = useState<Record<number, number>>({});

  const items = useMemo<GalleryItem[]>(
    () =>
      images.map((src, sourceIndex) => {
        const dim = dimensions?.[src];
        const ratio =
          dim && dim.width > 0 && dim.height > 0
            ? dim.width / dim.height
            : (measured[sourceIndex] ?? null);
        return { src, sourceIndex, ratio };
      }),
    [images, dimensions, measured],
  );

  const rows = useMemo(() => buildRows(items), [items]);
  /* Lightbox đi theo thứ tự hiển thị (desktop) để prev/next không nhảy lung tung. */
  const displayOrder = useMemo(() => rows.flatMap((row) => row.items), [rows]);
  const lightboxImages = useMemo(
    () => displayOrder.map((item) => item.src),
    [displayOrder],
  );

  /* Dự phòng: đọc tỷ lệ từ ảnh preview đã tải (cùng tỷ lệ ảnh gốc). */
  const measureRef = useCallback(
    (sourceIndex: number, known: boolean) => (figure: HTMLElement | null) => {
      if (!figure || known) return;
      const img = figure.querySelector<HTMLImageElement>(
        ".project-detail-images-default__trigger img",
      );
      if (!img) return;
      const record = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const ratio = img.naturalWidth / img.naturalHeight;
          setMeasured((prev) =>
            prev[sourceIndex] === ratio
              ? prev
              : { ...prev, [sourceIndex]: ratio },
          );
        }
      };
      if (img.complete) record();
      else img.addEventListener("load", record, { once: true });
    },
    [],
  );

  if (images.length === 0) return null;

  /** `pairShare` = phần chiều ngang của ảnh trong hàng ghép (0–1); undefined = hàng đơn. */
  const renderFigure = (item: GalleryItem, pairShare?: number) => {
    const inPair = pairShare !== undefined;
    const displayIndex = displayOrder.indexOf(item);
    const known = Boolean(dimensions?.[item.src]);
    return (
      <figure
        key={`${item.src}-${item.sourceIndex}`}
        ref={measureRef(item.sourceIndex, known || item.ratio !== null)}
        className={cn(
          "project-detail-images-default__item",
          /* Ảnh dọc đứng riêng (không có hàng kề để ghép): cao tối đa 1 màn */
          !inPair &&
            isPortrait(item) &&
            "project-detail-images-default__item--portrait",
        )}
        style={
          {
            ...placeholderStyle(placeholders?.[item.src]),
            "--pd-order": item.sourceIndex,
            /* Khung đúng tỷ lệ ảnh → ảnh lấp kín khung, không cắt, không viền */
            ...(item.ratio ? { "--pd-ratio": item.ratio } : null),
          } as CSSProperties
        }
      >
        <button
          ref={(el) => {
            if (el) triggerRefs.current.set(displayIndex, el);
            else triggerRefs.current.delete(displayIndex);
          }}
          type="button"
          className="project-detail-images-default__trigger"
          onClick={() => setLightboxIndex(displayIndex)}
          aria-label={`Xem ${title} — ${String(item.sourceIndex + 1).padStart(2, "0")}`}
        >
          <ProgressiveImage
            src={item.src}
            alt={`${title} — ${item.sourceIndex + 1}`}
            previewWidth={CANVAS_PREVIEW_WIDTH}
            fullWidth={CANVAS_FULL_WIDTH}
            layout="flow"
            loading={item.sourceIndex < EAGER_COUNT ? "eager" : "lazy"}
            sizes={gallerySizes(pairShare)}
            /* Hàng đầu = ảnh đầu trang: ưu tiên cao + tải lớp nét ngay (đã
               preload từ server, xem projects/[slug]/page.tsx). */
            priority={rows[0]?.items.includes(item) ?? false}
            className="project-detail-images-default__img"
          />
        </button>
      </figure>
    );
  };

  return (
    <section
      className={cn("project-detail-images-default", className)}
      aria-label="Ảnh dự án"
    >
      {/* Mỗi hàng = 1 khung cao đúng 1 màn (desktop), ảnh căn giữa theo chiều dọc
          → khi đang xem hàng này, hàng khác không ló vào. */}
      {rows.map((row) => (
        <div
          key={`${row.kind}-${row.items[0].sourceIndex}`}
          className={cn(
            "project-detail-images-default__row",
            row.kind === "pair" && "project-detail-images-default__row--pair",
          )}
        >
          {row.kind === "pair"
            ? row.items.map((item) =>
                renderFigure(item, pairShareOf(row.items, item)),
              )
            : renderFigure(row.items[0])}
        </div>
      ))}

      <ProjectDetailLightbox
        images={lightboxImages}
        title={title}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        getOriginElement={getOriginElement}
        scrollOriginIntoView
      />
    </section>
  );
}
