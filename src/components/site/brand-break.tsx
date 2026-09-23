import { LogoComponent } from "@/components/site/logo-component";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface BrandBreakImageProps {
  image: string;
  imageAlt: string;
  className?: string;
}

export function BrandBreakImage({
  image,
  imageAlt,
  className,
}: BrandBreakImageProps) {
  return (
    <div
      data-brand-break-image=""
      data-morph-pin-image=""
      className={cn(
        "relative z-10 min-h-0 flex-1 overflow-hidden",
        className,
      )}
    >
      <ProgressiveImage
        src={image}
        alt={imageAlt}
        previewWidth={CANVAS_PREVIEW_WIDTH}
        fullWidth={CANVAS_FULL_WIDTH}
        fullResponsive
        /* THỬ NGHIỆM tạm: chất lượng 30 để kiểm tra giật có do ảnh — xoá khi test xong */
        fullQuality={30}
        hidePreviewWhenFull
        className="object-contain p-4 grayscale md:p-8"
        sizes="100vw"
      />
    </div>
  );
}

interface BrandBreakProps {
  image: string;
  imageAlt: string;
  id?: string;
  className?: string;
}

export function BrandBreak({
  image,
  imageAlt,
  id = "about-brand-break",
  className,
}: BrandBreakProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative flex min-h-[calc(100dvh-var(--site-header-total-height))] w-full flex-col overflow-hidden bg-background",
        className,
      )}
      aria-label="Brand break"
    >
      <LogoComponent />
      <BrandBreakImage image={image} imageAlt={imageAlt} />
    </section>
  );
}
