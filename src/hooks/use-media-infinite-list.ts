"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMediaPage } from "@/lib/fetch-media-page";
import type { MediaItem, MediaType } from "@/lib/media";

export function useMediaInfiniteList(options: {
  enabled: boolean;
  query?: string;
  type?: MediaType;
}) {
  const { enabled, query = "", type } = options;
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (cursor: string | null, mode: "replace" | "append") => {
      if (mode === "append") {
        if (!cursor || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        requestIdRef.current += 1;
        setMedia([]);
        setNextCursor(null);
        setLoading(true);
        setError(null);
      }

      const requestId = requestIdRef.current;

      try {
        const page = await fetchMediaPage({
          q: query || undefined,
          cursor,
          type,
        });
        if (requestId !== requestIdRef.current) return;

        setNextCursor(page.nextCursor);
        setMedia((prev) => {
          if (mode === "replace") return page.items;
          const seen = new Set(prev.map((item) => item.id));
          const additions = page.items.filter((item) => !seen.has(item.id));
          return additions.length ? [...prev, ...additions] : prev;
        });
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Lỗi tải media");
        if (mode === "replace") {
          setMedia([]);
          setNextCursor(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          if (mode === "replace") setLoading(false);
          else {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          }
        }
      }
    },
    [query, type],
  );

  const reload = useCallback(() => {
    void loadPage(null, "replace");
  }, [loadPage]);

  useEffect(() => {
    if (!enabled) {
      requestIdRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset danh sách khi tắt — đồng bộ với request đang chạy (requestIdRef)
      setMedia([]);
      setNextCursor(null);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      return;
    }
    void loadPage(null, "replace");
  }, [enabled, loadPage]);

  useEffect(() => {
    if (!enabled || loading || !nextCursor) return;
    const root = listRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPage(nextCursor, "append");
        }
      },
      { root, rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, loading, loadingMore, nextCursor, loadPage, media.length]);

  const removeItem = useCallback((id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    media,
    nextCursor,
    hasMore: Boolean(nextCursor),
    loading,
    loadingMore,
    error,
    setError,
    reload,
    removeItem,
    listRef,
    sentinelRef,
  };
}
