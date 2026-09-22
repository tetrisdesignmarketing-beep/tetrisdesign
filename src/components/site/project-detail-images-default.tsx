"use client";

import { useState } from "react";
import { ProjectDetailLightbox } from "@/components/site/project-detail-lightbox";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface ProjectDetailImagesDefaultProps {
  images: string[];
  title: string;
  className?: string;
}

const EAGER_COUNT = 4;

/** Gallery LAYOUTDEFAULT — stack ảnh, cursor mắt khi hover, lightbox như LAYOUT1. */
export function ProjectDetailImagesDefault({
  images,
  title,
  className,
}: ProjectDetailImagesDefaultProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section
      className={cn("project-detail-images-default", className)}
      aria-label="Ảnh dự án"
    >
      {images.map((src, index) => (
        <figure
          key={`${src}-${index}`}
          className="project-detail-images-default__item"
        >
          <button
            type="button"
            className="project-detail-images-default__trigger"
            onClick={() => setLightboxIndex(index)}
            aria-label={`Xem ${title} — ${String(index + 1).padStart(2, "0")}`}
          >
            <ProgressiveImage
              src={src}
              alt={`${title} — ${index + 1}`}
              previewWidth={CANVAS_PREVIEW_WIDTH}
              fullWidth={CANVAS_FULL_WIDTH}
              layout="flow"
              loading={index < EAGER_COUNT ? "eager" : "lazy"}
              sizes="100vw"
              // Desktop sizing (100vw × chiều cao còn lại dưới menu, object-fit: contain)
              // đã khai báo đủ trong globals.css — không cần lặp lại bằng Tailwind ở đây.
              className="project-detail-images-default__img"
            />
          </button>
        </figure>
      ))}

      <ProjectDetailLightbox
        images={images}
        title={title}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </section>
  );
}
