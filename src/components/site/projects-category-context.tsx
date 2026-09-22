"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
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

export function ProjectsCategoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Lazy init — chỉ đọc URL 1 lần lúc mount (deep-link `/projects?category=fnb`).
  const [category, setCategoryState] = useState<ProjectCategory | null>(() =>
    parseProjectCategory(searchParams.get("category") ?? undefined),
  );

  const setCategory = useCallback(
    (next: ProjectCategory | null) => {
      setCategoryState(next);
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
