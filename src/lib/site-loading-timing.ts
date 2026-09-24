/** Timing tokens cho site loading — đọc từ `[data-site-loading]` CSS vars. */

const DISMISS_FALLBACK_MS = 7000;

function cssTimeToMs(value: string) {
  const token = value.trim();
  if (!token) return NaN;
  if (token.endsWith("ms")) return Number.parseFloat(token);
  if (token.endsWith("s")) return Number.parseFloat(token) * 1000;
  return Number.parseFloat(token);
}

/** Độ dài 1 vòng animation khối logo (`--sl-loop-ms`, mặc định 1.7s). */
export function readSiteLoadingLoopMs(node: Element | null): number {
  if (!node) return 1700;
  const raw =
    getComputedStyle(node).getPropertyValue("--sl-loop-ms").trim() || "1.7s";
  const ms = cssTimeToMs(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 1700;
}

/**
 * Còn bao lâu tới hết vòng animation hiện tại (lúc 3 khối đã trượt ra hết →
 * tắt không bị cắt giữa chừng). Không đọc được animation → null.
 */
export function msUntilLoopEnd(root: Element | null): number | null {
  const block = root?.querySelector<HTMLElement>("[data-site-loading-block]");
  if (!block || typeof block.getAnimations !== "function") return null;
  const anim = block.getAnimations()[0];
  const current = anim ? Number(anim.currentTime) : Number.NaN;
  if (!Number.isFinite(current)) return null;
  const loop = readSiteLoadingLoopMs(root);
  const into = current % loop;
  return into === 0 && current > 0 ? 0 : loop - into;
}

/** Cho `loading.tsx` của route chạy lại từ đầu vòng (nối tiếp liền mạch). */
export function restartRouteLoadingAnimations(): void {
  document
    .querySelectorAll<HTMLElement>("main [data-site-loading-block]")
    .forEach((block) => {
      if (typeof block.getAnimations !== "function") return;
      block.getAnimations().forEach((anim) => {
        anim.currentTime = 0;
      });
    });
}

/** Thời lượng intro (`--sl-intro-ms`, mặc định = 1 vòng 1.7s). */
export function readSiteLoadingIntroMs(node: Element | null): number {
  if (!node) return DISMISS_FALLBACK_MS;
  const raw =
    getComputedStyle(node).getPropertyValue("--sl-intro-ms").trim() || "1.7s";
  const ms = cssTimeToMs(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : DISMISS_FALLBACK_MS;
}

export function readSiteLoadingDismissMs(node: Element | null): number {
  if (!node) return DISMISS_FALLBACK_MS;
  const styles = getComputedStyle(node);
  const raw =
    styles.getPropertyValue("--sl-dismiss-ms").trim() ||
    styles.getPropertyValue("--sl-autodismiss-ms").trim() ||
    "0.5s";
  const ms = cssTimeToMs(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : DISMISS_FALLBACK_MS;
}
