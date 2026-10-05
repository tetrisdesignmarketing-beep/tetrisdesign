"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorPreview } from "@/components/admin/editor-preview-context";

type ResizableImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

function parseWidthPx(
  style?: React.CSSProperties | string,
  widthAttr?: string | number,
): number | null {
  if (typeof style === "string") {
    const px = style.match(/width:\s*(\d+)px/i);
    if (px) return Number(px[1]);
    const pct = style.match(/width:\s*(\d+)%/i);
    if (pct) return null;
  }
  if (style && typeof style === "object" && style.width) {
    const w = String(style.width);
    if (w.endsWith("px")) return parseInt(w, 10);
  }
  if (widthAttr && typeof widthAttr === "number") return widthAttr;
  if (widthAttr && String(widthAttr).endsWith("px")) {
    return parseInt(String(widthAttr), 10);
  }
  return null;
}

export function ResizableImage({
  src,
  alt,
  style,
  width: widthAttr,
  ...props
}: ResizableImageProps) {
  const ctx = useEditorPreview();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const widthRef = useRef(300);
  const [displayWidth, setDisplayWidth] = useState<number | null>(
    parseWidthPx(style, widthAttr),
  );
  const [isDragging, setIsDragging] = useState(false);

  /* Thuộc tính width đổi (từ editor) / ảnh khác → đồng bộ lại (trong render). */
  const parsedWidth = parseWidthPx(style, widthAttr);
  const widthKey = `${parsedWidth}\u0001${src}`;
  const [prevWidthKey, setPrevWidthKey] = useState(widthKey);
  if (prevWidthKey !== widthKey) {
    setPrevWidthKey(widthKey);
    setDisplayWidth(parsedWidth);
  }

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!ctx || !src) return;
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const currentWidth =
        displayWidth ?? imgRef.current?.offsetWidth ?? 300;
      widthRef.current = currentWidth;
      setIsDragging(true);

      const onMove = (moveEvent: MouseEvent) => {
        const next = Math.max(
          80,
          Math.min(900, currentWidth + (moveEvent.clientX - startX)),
        );
        widthRef.current = next;
        setDisplayWidth(next);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setIsDragging(false);
        if (typeof src === "string") {
          ctx.onImageResize(src, widthRef.current);
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [ctx, displayWidth, src],
  );

  if (!ctx || !src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} style={style} width={widthAttr} {...props} />
    );
  }

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-block max-w-full align-middle ${isDragging ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"}`}
      style={displayWidth ? { width: displayWidth } : { width: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        {...props}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 6,
        }}
        draggable={false}
      />
      <span
        role="button"
        tabIndex={0}
        aria-label="Kéo để chỉnh kích thước ảnh"
        className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm border-2 border-background bg-primary shadow"
        onMouseDown={handleResizeStart}
      />
    </span>
  );
}
