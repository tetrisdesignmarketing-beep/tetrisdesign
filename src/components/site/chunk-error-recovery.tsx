"use client";

import { useEffect } from "react";

const RELOADED_KEY = "site-chunk-reload";

/** `ChunkLoadError` = React không hydrate được → mọi handler chết (menu, filter,
 *  carousel). Hay gặp khi HTML còn trong cache Safari nhưng chunk đã đổi hash.
 *  Reload đúng 1 lần mỗi session để lấy bundle mới, không tạo vòng lặp. */
function isChunkError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
        ? reason
        : "";
  return /ChunkLoadError|Loading chunk|Importing a module script failed|Failed to load chunk/i.test(
    message,
  );
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    /* Effect chạy = React đã hydrate. Bật cả production: public/morph-pin.js
       và public/fps-pager.js đọc cờ này để biết không cần chạy fallback. */
    (window as unknown as { __siteHydrated?: boolean }).__siteHydrated = true;

    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem(RELOADED_KEY) === "1") return;
        sessionStorage.setItem(RELOADED_KEY, "1");
      } catch {
        /* private mode: không có sessionStorage → bỏ qua, tránh loop */
        return;
      }
      window.location.reload();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkError(event.reason)) return;
      reloadOnce();
    };

    const onError = (event: ErrorEvent) => {
      if (!isChunkError(event.error ?? event.message)) return;
      reloadOnce();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
