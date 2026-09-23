import type { CSSProperties, Ref } from "react";
import {
  TETRIS_LOGO_BLOCKS,
  TETRIS_LOGO_VIEW_H,
  TETRIS_LOGO_VIEW_W,
} from "@/lib/tetris-logo-mark";

interface SiteLoadingScreenProps {
  rootRef?: Ref<HTMLDivElement>;
  /** Tự ẩn sau `--sl-dismiss-ms` — intro/overlay timer mode */
  autoDismiss?: boolean;
  /** Intro mở web: tự ẩn sau `--sl-intro-ms` (1 vòng animation). */
  intro?: boolean;
}

const loadingVars = {
  "--sl-sum-w": TETRIS_LOGO_VIEW_W,
  "--sl-sum-h": TETRIS_LOGO_VIEW_H,
  "--sl-h-top": TETRIS_LOGO_BLOCKS.top.h,
  "--sl-h-mid": TETRIS_LOGO_BLOCKS.mid.h,
  "--sl-h-bot": TETRIS_LOGO_BLOCKS.bot.h,
  "--sl-w-top": TETRIS_LOGO_BLOCKS.top.w,
  "--sl-w-mid": TETRIS_LOGO_BLOCKS.mid.w,
  "--sl-w-bot": TETRIS_LOGO_BLOCKS.bot.w,
  "--sl-x-top": TETRIS_LOGO_BLOCKS.top.x,
  "--sl-x-mid": TETRIS_LOGO_BLOCKS.mid.x,
  "--sl-x-bot": TETRIS_LOGO_BLOCKS.bot.x,
} as CSSProperties;

export function SiteLoadingScreen({
  rootRef,
  autoDismiss = false,
  intro = false,
}: SiteLoadingScreenProps) {
  return (
    <div
      ref={rootRef}
      data-site-loading
      data-site-loading-autodismiss={autoDismiss ? "" : undefined}
      data-site-loading-intro={intro ? "" : undefined}
      role="status"
      aria-live="polite"
      aria-label="Đang tải"
      style={loadingVars}
    >
      <span data-site-loading-block="top" />
      <span data-site-loading-block="mid" />
      <span data-site-loading-block="bot" />
      <span className="sr-only">Đang tải</span>
    </div>
  );
}
