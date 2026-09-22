"use client";

import { useEffect, useState } from "react";
import { useMorphPinScroll } from "@/hooks/use-morph-pin-scroll";

const SECTION_ID = "about-brand-break";

export type BrandBreakLogoPhase = "waiting" | "rest";

export function useBrandBreakScroll() {
  return useMorphPinScroll(SECTION_ID);
}

/**
 * Logo enter/exit giờ chạy hoàn toàn trong `sync()` của use-morph-pin-scroll.ts
 * (tính liên tục theo scrollTop, đối xứng 2 chiều cuộn — xem `--morph-pin-enter-x-*`),
 * ghi kết quả "đã tới đích hay chưa" ra `root.dataset.brandBreakLogo` mỗi frame.
 * Hook này chỉ soi (mirror) attribute đó thành React state để truyền tiếp làm
 * prop `logoPhase` cho ContentPartnerSection (dùng làm fallback hiện text iOS
 * khi IntersectionObserver không fire).
 */
export function useBrandBreakLogoEnter(
  rootRef: React.RefObject<HTMLDivElement | null>,
): BrandBreakLogoPhase {
  const [phase, setPhase] = useState<BrandBreakLogoPhase>("waiting");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      const next: BrandBreakLogoPhase =
        root.dataset.brandBreakLogo === "rest" ? "rest" : "waiting";
      setPhase((prev) => (prev === next ? prev : next));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-brand-break-logo"],
    });
    return () => observer.disconnect();
  }, [rootRef]);

  return phase;
}
