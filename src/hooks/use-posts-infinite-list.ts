"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPostsPage,
  patchPostFeatured,
  patchPostsReorder,
  type AdminPostListItem,
} from "@/lib/fetch-posts-page";

/**
 * Cuộn vô hạn cho bảng /admin/posts — rập khuôn `use-media-infinite-list.ts`.
 * Khác: `root: null` cho IntersectionObserver (trang admin cuộn theo viewport
 * bình thường, không có container scroll riêng như media drawer); thêm
 * `reorderPosts` để lưu kéo thả (optimistic update + rollback khi lỗi);
 * `featuredOnly` lọc chỉ bài ưu tiên và `query` tìm theo tiêu đề (đổi giá trị
 * nào cũng tự tải lại từ đầu, giống cách `use-media-infinite-list.ts` phản ứng
 * với `query`/`type`); và `toggleFeatured` bật/tắt ưu tiên 1 bài ngay từ bảng
 * (optimistic + rollback).
 */
export function usePostsInfiniteList(
  options: { featuredOnly?: boolean; query?: string } = {},
) {
  const { featuredOnly = false, query = "" } = options;
  const [posts, setPosts] = useState<AdminPostListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (cursor: string | null, mode: "replace" | "append") => {
      if (mode === "append") {
        if (!cursor || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        requestIdRef.current += 1;
        setPosts([]);
        setNextCursor(null);
        setLoading(true);
        setError(null);
      }

      const requestId = requestIdRef.current;

      try {
        const page = await fetchPostsPage({ cursor, featuredOnly, query });
        if (requestId !== requestIdRef.current) return;

        setNextCursor(page.nextCursor);
        setPosts((prev) => {
          if (mode === "replace") return page.items;
          const seen = new Set(prev.map((item) => item.id));
          const additions = page.items.filter((item) => !seen.has(item.id));
          return additions.length ? [...prev, ...additions] : prev;
        });
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Lỗi tải bài đăng");
        if (mode === "replace") {
          setPosts([]);
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
    [featuredOnly, query],
  );

  const reload = useCallback(() => {
    void loadPage(null, "replace");
  }, [loadPage]);

  useEffect(() => {
    void loadPage(null, "replace");
  }, [loadPage]);

  useEffect(() => {
    if (loading || !nextCursor) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPage(nextCursor, "append");
        }
      },
      { root: null, rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, loadingMore, nextCursor, loadPage, posts.length]);

  const removeItem = useCallback((id: string) => {
    setPosts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const reorderPosts = useCallback(
    async (newOrder: AdminPostListItem[]) => {
      const previous = posts;
      setPosts(newOrder);
      setError(null);
      try {
        await patchPostsReorder(newOrder.map((item) => item.id));
      } catch (err) {
        setPosts(previous);
        setError(
          err instanceof Error ? err.message : "Không thể lưu thứ tự mới",
        );
      }
    },
    [posts],
  );

  const toggleFeatured = useCallback(
    async (id: string) => {
      const target = posts.find((post) => post.id === id);
      if (!target || togglingIds.has(id)) return;

      const nextFeatured = !target.featured;
      setTogglingIds((prev) => new Set(prev).add(id));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, featured: nextFeatured } : post,
        ),
      );
      setError(null);

      try {
        await patchPostFeatured(id, nextFeatured);
        // Đang lọc chỉ-ưu-tiên mà vừa bỏ ưu tiên → bài không còn khớp filter nữa.
        if (featuredOnly && !nextFeatured) {
          removeItem(id);
        }
      } catch (err) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === id ? { ...post, featured: target.featured } : post,
          ),
        );
        setError(
          err instanceof Error ? err.message : "Không thể cập nhật ưu tiên",
        );
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [posts, togglingIds, featuredOnly, removeItem],
  );

  return {
    posts,
    nextCursor,
    hasMore: Boolean(nextCursor),
    loading,
    loadingMore,
    error,
    setError,
    reload,
    removeItem,
    reorderPosts,
    toggleFeatured,
    togglingIds,
    sentinelRef,
  };
}
