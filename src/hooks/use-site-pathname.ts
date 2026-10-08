"use client";

import { usePathname } from "next/navigation";

/**
 * `usePathname()` đã chuẩn hoá cho site public.
 *
 * Trang chủ dựng sẵn (ISR, `revalidate`): khi Next prerender route gốc,
 * `usePathname()` trả "/index" thay vì "/" (payload RSC `"c":["","index"]`).
 * HTML dựng sẵn vì vậy coi trang chủ là "trang khác" (header solid + khoảng
 * chừa header, menu TRANG CHỦ không sáng) và React 19 production không sửa
 * lại thuộc tính lệch khi hydrate → lỗi kẹt tới lần đổi state kế tiếp.
 * Không có trang thật nào tên /index nên đổi về "/" là an toàn.
 */
export function useSitePathname(): string {
  const pathname = usePathname();
  return pathname === "/index" ? "/" : pathname;
}
