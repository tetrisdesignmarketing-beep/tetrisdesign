"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` lúc render trên server / hydrate, `true` sau đó ở trình duyệt.
 * Thay mẫu `useState(false)` + `useEffect(() => setMounted(true))` (gây thêm
 * 1 lượt render đồng bộ trong effect) — dùng cho portal / API chỉ có ở client.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
