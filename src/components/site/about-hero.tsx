"use client";

import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface AboutHeroProps {
  src: string;
  alt: string;
  className?: string;
}

export function AboutHero({ src, alt, className }: AboutHeroProps) {
  return (
    <div
      data-morph-pin-image=""
      className={cn(
        "relative z-10 min-h-0 w-full flex-1 overflow-hidden",
        className,
      )}
    >
      <ProgressiveImage
        src={src}
        alt={alt}
        previewWidth={CANVAS_PREVIEW_WIDTH}
        fullWidth={CANVAS_FULL_WIDTH}
        fullResponsive
        /* THỬ NGHIỆM tạm: chất lượng 30 để kiểm tra giật có do ảnh — xoá khi test xong */
        fullQuality={30}
        hidePreviewWhenFull
        priority
        className="object-contain p-4 grayscale md:p-8"
        sizes="100vw"
      />
    </div>
  );
}
