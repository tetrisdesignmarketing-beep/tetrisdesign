"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { parseProjectCategory, type ProjectCategory } from "@/lib/site-content";

interface ProjectsCategoryContextValue {
  category: ProjectCategory | null;
  setCategory: (category: ProjectCategory | null) => void;
}

const ProjectsCategoryContext =
  createContext<ProjectsCategoryContextValue | null>(null);

/**
 * `/projects`: category tab chuyển client-side, KHÔNG qua `router.push/replace`
 * (tránh Next.js refetch RSC + màn loading mỗi lần đổi tab — data đã fetch
 * toàn bộ 1 lần lúc vào trang, xem `ProjectsPageData` trong `page.tsx`).
 * URL vẫn cập nhật qua `history.replaceState` để giữ deep-link/share được,
 * nhưng không kích hoạt điều hướng của Next router.
 */
export function useProjectsCategory() {
  const ctx = useContext(ProjectsCategoryContext);
  if (!ctx) {
    throw new Error(
      "useProjectsCategory() phải được gọi bên trong <ProjectsCategoryProvider>",
    );
  }
  return ctx;
}

function subscribeUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function readUrlCategory(): string | null {
  return new URLSearchParams(window.location.search).get("category");
}

/** Lúc dựng sẵn trang (server) không có query → "Tất cả". */
function readServerCategory(): string | null {
  return null;
}

export function ProjectsCategoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  /*
   * KHÔNG dùng `useSearchParams()`: trang /projects được dựng sẵn (ISR), mà
   * useSearchParams trong trang dựng sẵn khiến cả cây bên trong chỉ render ở
   * trình duyệt (HTML trống danh sách dự án → chậm + mất SEO).
   * useSyncExternalStore: HTML dựng sẵn = "Tất cả"; trình duyệt đọc
   * `?category=` (deep-link) ngay khi hydrate, không lỗi lệch hydration.
   */
  const urlCategory = useSyncExternalStore(
    subscribeUrl,
    readUrlCategory,
    readServerCategory,
  );
  /* undefined = người xem chưa tự chọn tab → theo URL. */
  const [picked, setPicked] = useState<ProjectCategory | null | undefined>(
    undefined,
  );
  const category =
    picked !== undefined
      ? picked
      : parseProjectCategory(urlCategory ?? undefined);

  const setCategory = useCallback(
    (next: ProjectCategory | null) => {
      setPicked(next);
      const href = next ? `${pathname}?category=${next}` : pathname;
      window.history.replaceState(window.history.state, "", href);
    },
    [pathname],
  );

  const value = useMemo(
    () => ({ category, setCategory }),
    [category, setCategory],
  );

  return (
    <ProjectsCategoryContext.Provider value={value}>
      {children}
    </ProjectsCategoryContext.Provider>
  );
}
