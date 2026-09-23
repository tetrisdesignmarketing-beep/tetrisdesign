"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  CANVAS_FULL_QUALITY,
  CANVAS_PREVIEW_QUALITY,
  optimizedImageSrc,
} from "@/lib/optimized-image-src";
import { isSvgSrc } from "@/lib/site-image";
import { cn } from "@/lib/utils";

type ProgressiveImageProps = {
  src: string;
  alt: string;
  previewWidth: number;
  fullWidth: number;
  previewQuality?: number;
  fullQuality?: number;
  /**
   * Full layer uses the storage URL as-is (no `/_next/image` re-encode).
   * Default true site-wide — sharpest match to uploaded asset after preview.
   * Set false only when a smaller optimizer full layer is intentional.
   */
  fullUseOriginal?: boolean;
  /**
   * Full layer gets a `srcSet` (optimizer `fullWidth`w + original) so phones
   * pick the ~`fullWidth` px version instead of the multi-MB original, while
   * desktop / retina-wide screens still pick the original. Pure HTML — the
   * browser chooses per device, no JS / hydration concerns.
   */
  fullResponsive?: boolean;
  /**
   * Hide (visibility) the preview layer once the sharp layer has faded in —
   * one image to paint instead of two stacked (matters for images that
   * scale every scroll frame, e.g. About morph-pin).
   */
  hidePreviewWhenFull?: boolean;
  /** Fetch the small image. Offscreen slides stay unloaded. */
  loadPreview?: boolean;
  /** Fetch the sharp image after the preview is visible. */
  loadFull?: boolean;
  /**
   * After the sharp layer has loaded once, keep it mounted/visible even when
   * `loadFull` turns off — avoids soft→sharp flash on revisit (hero slider).
   */
  persistFull?: boolean;
  /** High priority on the preview request (LCP). */
  priority?: boolean;
  /** Crossfade the sharp layer. Off when a parent already animates opacity. */
  fade?: boolean;
  /** `fill` = absolute crop. `flow` = preview sets height, sharp overlays. */
  layout?: "fill" | "flow";
  loading?: "eager" | "lazy";
  className?: string;
  sizes?: string;
};

function isImgDecoded(img: HTMLImageElement | null) {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function ProgressiveImage({
  src,
  alt,
  previewWidth,
  fullWidth,
  previewQuality = CANVAS_PREVIEW_QUALITY,
  fullQuality = CANVAS_FULL_QUALITY,
  fullUseOriginal = true,
  fullResponsive = false,
  hidePreviewWhenFull = false,
  loadPreview = true,
  loadFull = true,
  persistFull = false,
  priority = false,
  fade = true,
  layout = "fill",
  loading = "eager",
  className,
  sizes = "100vw",
}: ProgressiveImageProps) {
  const reduced = usePrefersReducedMotion();
  const original = src.trim();
  const previewTarget = optimizedImageSrc(
    original,
    previewWidth,
    previewQuality,
  );
  const fullTarget = fullUseOriginal
    ? original
    : optimizedImageSrc(original, fullWidth, fullQuality);
  const [previewSrc, setPreviewSrc] = useState(previewTarget);
  const [fullSrc, setFullSrc] = useState(fullTarget);
  const [previewReady, setPreviewReady] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const previewRef = useRef<HTMLImageElement>(null);
  const fullRef = useRef<HTMLImageElement>(null);
  const targetKey = `${previewTarget}\0${fullTarget}`;
  const targetKeyRef = useRef(targetKey);

  useEffect(() => {
    if (targetKeyRef.current === targetKey) return;
    targetKeyRef.current = targetKey;
    setPreviewSrc(previewTarget);
    setFullSrc(fullTarget);
    setPreviewReady(false);
    setFullReady(false);
  }, [fullTarget, previewTarget, targetKey]);

  /* Chỉ ẩn preview SAU khi lớp nét đã fade xong (200ms) — tránh chớp nền.
     State chỉ set trong callback timer; điều kiện ẩn suy ra lúc render. */
  const [previewHiddenFor, setPreviewHiddenFor] = useState<string | null>(null);
  useEffect(() => {
    if (!hidePreviewWhenFull || !fullReady) return;
    const timer = window.setTimeout(() => setPreviewHiddenFor(fullSrc), 300);
    return () => window.clearTimeout(timer);
  }, [hidePreviewWhenFull, fullReady, fullSrc]);
  const previewHidden =
    hidePreviewWhenFull && fullReady && previewHiddenFor === fullSrc;

  const responsiveFull =
    fullResponsive && fullUseOriginal
      ? optimizedImageSrc(original, fullWidth, fullQuality)
      : null;
  const fullSrcSet =
    responsiveFull && responsiveFull !== original && fullSrc === original
      ? `${responsiveFull} ${fullWidth}w, ${original} 4096w`
      : undefined;

  const wantFull = loadFull || (persistFull && fullReady);
  const showFull = wantFull && previewReady && previewSrc !== fullSrc;

  useEffect(() => {
    if (!showFull && !persistFull) setFullReady(false);
  }, [showFull, persistFull]);

  /* Cache/LCP: onLoad có thể không chạy nếu img đã complete trước khi gắn handler. */
  useEffect(() => {
    if (!loadPreview || previewReady) return;
    if (isImgDecoded(previewRef.current)) setPreviewReady(true);
  }, [loadPreview, previewReady, previewSrc]);

  useEffect(() => {
    if (!showFull || fullReady) return;
    if (isImgDecoded(fullRef.current)) setFullReady(true);
  }, [showFull, fullReady, fullSrc]);

  if (!original || isSvgSrc(original)) {
    if (!original) return null;
    if (layout === "flow") {
      return (
        <img
          src={original}
          alt={alt}
          draggable={false}
          decoding="async"
          loading={loading}
          className={cn("block h-auto w-full", className)}
        />
      );
    }
    return (
      <Image
        src={original}
        alt={alt}
        fill
        draggable={false}
        className={className}
        sizes={sizes}
      />
    );
  }

  const layer =
    layout === "flow"
      ? "block h-auto w-full"
      : "absolute inset-0 h-full w-full";
  const fullLayer =
    layout === "flow" ? "absolute inset-0 !h-full !w-full" : layer;

  const preview = loadPreview ? (
    <img
      ref={previewRef}
      src={previewSrc}
      alt={fullReady ? "" : alt}
      aria-hidden={fullReady || undefined}
      draggable={false}
      decoding="async"
      loading={loading}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setPreviewReady(true)}
      onError={() => {
        if (previewSrc !== original) setPreviewSrc(original);
      }}
      className={cn(layer, className, previewHidden && "invisible")}
    />
  ) : null;
  const full = showFull ? (
    <img
      ref={fullRef}
      src={fullSrc}
      srcSet={fullSrcSet}
      sizes={fullSrcSet ? sizes : undefined}
      data-progressive-full=""
      alt={fullReady ? alt : ""}
      aria-hidden={fullReady ? undefined : true}
      draggable={false}
      decoding="async"
      onLoad={() => setFullReady(true)}
      onError={() => {
        if (fullSrc !== original) setFullSrc(original);
      }}
      className={cn(
        fullLayer,
        className,
        !fullReady && "opacity-0",
        fade && fullReady && "opacity-100",
        fade && !reduced && "transition-opacity duration-200",
      )}
    />
  ) : null;

  if (layout === "flow") {
    return (
      <span className="relative block w-full">
        {preview}
        {full}
      </span>
    );
  }

  return (
    <>
      {preview}
      {full}
    </>
  );
}
