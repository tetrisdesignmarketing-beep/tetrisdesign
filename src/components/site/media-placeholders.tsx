"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Ảnh mờ LQIP (Media.placeholder) theo URL ảnh, do trang (server) tra sẵn rồi
 * truyền xuống. Mọi `ProgressiveImage` bên trong tự lấy ảnh mờ của đúng `src`
 * → khung ảnh hiện bản mờ ngay trong HTML thay vì trống. Chỉ những URL có
 * trong map mới có ảnh mờ (trang tự chọn ảnh nào cần, vd. không gồm logo
 * trong suốt).
 */
const MediaPlaceholdersContext = createContext<Record<string, string>>({});

export function MediaPlaceholdersProvider({
  value,
  children,
}: {
  value: Record<string, string>;
  children: ReactNode;
}) {
  const parent = useContext(MediaPlaceholdersContext);
  const merged =
    Object.keys(parent).length > 0 ? { ...parent, ...value } : value;
  return (
    <MediaPlaceholdersContext.Provider value={merged}>
      {children}
    </MediaPlaceholdersContext.Provider>
  );
}

export function useMediaPlaceholder(src: string): string | undefined {
  return useContext(MediaPlaceholdersContext)[src.trim()];
}
