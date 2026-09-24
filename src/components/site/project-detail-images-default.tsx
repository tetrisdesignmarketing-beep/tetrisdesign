"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { ProjectDetailLightbox } from "@/components/site/project-detail-lightbox";
import { ProgressiveImage } from "@/components/site/progressive-image";
import type { MediaDimensions } from "@/lib/media-dimensions";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface ProjectDetailImagesDefaultProps {
  images: string[];
  title: string;
  /** Kích thước thật theo URL (server tra từ Media). Thiếu → đo ở trình duyệt. */
  dimensions?: Record<string, MediaDimensions>;
  className?: string;
}

const EAGER_COUNT = 4;
/** Rộng/cao < 0.9 → ảnh dọc. Gần vuông (0.9–1.1) coi như ngang (full width). */
const PORTRAIT_MAX_RATIO = 0.9;

type GalleryItem = {
  src: string;
  /** Vị trí gốc theo thứ tự admin (mobile hiển thị theo thứ tự này). */
  sourceIndex: number;
  /** Rộng/cao; null = chưa biết. */
  ratio: number | null;
};

type GalleryRow =
  | { kind: "single"; items: [GalleryItem] }
  | { kind: "pair"; items: [GalleryItem, GalleryItem] };

function isPortrait(item: GalleryItem) {
  return item.ratio !== null && item.ratio < PORTRAIT_MAX_RATIO;
}

/**
 * Desktop: ảnh ngang = 1 hàng full; ảnh dọc luôn ghép cặp với ảnh dọc gần nhất
 * phía sau (bỏ qua ảnh ngang ở giữa) → thứ tự hiển thị có thể khác thứ tự
 * admin. Ảnh dọc lẻ cuối cùng → ghép với hàng ảnh ngang liền trước (hoặc liền
 * sau) thành 1 hàng "justified" (cùng chiều cao, rộng theo tỷ lệ) để vẫn phủ
 * kín chiều ngang mà không cắt; chỉ khi không có hàng đơn kề bên mới đứng riêng.
 */
function buildRows(items: GalleryItem[]): GalleryRow[] {
  const rows: GalleryRow[] = [];
  let openPair: GalleryRow | null = null;
  for (const item of items) {
    if (!isPortrait(item)) {
      rows.push({ kind: "single", items: [item] });
      continue;
    }
    if (openPair && openPair.kind === "single") {
      const first = openPair.items[0];
      const index = rows.indexOf(openPair);
      rows[index] = { kind: "pair", items: [first, item] };
      openPair = null;
      continue;
    }
    openPair = { kind: "single", items: [item] };
    rows.push(openPair);
  }

  if (openPair) {
    const lone = openPair.items[0];
    const index = rows.indexOf(openPair);
    const prev = rows[index - 1];
    const next = rows[index + 1];
    if (prev?.kind === "single") {
      rows.splice(index - 1, 2, { kind: "pair", items: [prev.items[0], lone] });
    } else if (next?.kind === "single") {
      rows.splice(index, 2, { kind: "pair", items: [lone, next.items[0]] });
    }
  }
  return rows;
}

/** Phần chiều ngang của 1 ảnh trong hàng ghép = tỷ lệ ảnh / tổng tỷ lệ hàng. */
function pairShareOf(items: GalleryItem[], item: GalleryItem) {
  const total = items.reduce((sum, it) => sum + (it.ratio ?? 1), 0);
  return total > 0 ? (item.ratio ?? 1) / total : 1 / items.length;
}

/** Gallery LAYOUTDEFAULT — cursor mắt khi hover, lightbox như LAYOUT1. */
export function ProjectDetailImagesDefault({
  images,
  title,
  dimensions,
  className,
}: ProjectDetailImagesDefaultProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
            "--pd-order": item.sourceIndex,
            /* Khung đúng tỷ lệ ảnh → ảnh lấp kín khung, không cắt, không viền */
            ...(item.ratio ? { "--pd-ratio": item.ratio } : null),
          } as CSSProperties
        }
      >
        <button
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
            sizes={
              inPair
                ? `(min-width: 1024px) ${Math.ceil(pairShare * 100)}vw, 100vw`
                : "100vw"
            }
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
      />
    </section>
  );
}
