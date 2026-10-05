"use client";

import { useEffect } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  side = "left",
  title,
  children,
  fullScreen = false,
  onToggleFullScreen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  title: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  onToggleFullScreen?: () => void;
}) {
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label="Đóng"
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
          fullScreen && "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute flex flex-col bg-background shadow-xl transition-[transform,inset,width,max-width] duration-200",
          fullScreen
            ? "inset-0 w-full max-w-none"
            : cn(
                "inset-y-0 w-full max-w-md",
                side === "left" ? "left-0" : "right-0",
              ),
          open
            ? "translate-x-0"
            : !fullScreen && side === "left"
              ? "-translate-x-full"
              : !fullScreen
                ? "translate-x-full"
                : "translate-x-0",
          !open && fullScreen && "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-1">
            {onToggleFullScreen ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleFullScreen}
                aria-label={fullScreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {fullScreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Đóng media"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
