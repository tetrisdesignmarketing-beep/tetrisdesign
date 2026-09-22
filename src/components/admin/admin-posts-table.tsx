"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Filter, GripVertical, Loader2, Search, X } from "lucide-react";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePostsInfiniteList } from "@/hooks/use-posts-infinite-list";
import type { AdminPostListItem } from "@/lib/fetch-posts-page";
import { cn } from "@/lib/utils";

const TABLE_COLUMN_COUNT = 8;

function SortablePostRow({
  post,
  onDeleted,
  onToggleFeatured,
  isToggling,
}: {
  post: AdminPostListItem;
  onDeleted: () => void;
  onToggleFeatured: () => void;
  isToggling: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "relative z-10 opacity-60 shadow-lg")}
    >
      <TableCell className="w-10 px-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-8 w-8 touch-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Kéo để đổi vị trí"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{post.title}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {post.address}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {post.concept}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {post.category?.name ?? "—"}
      </TableCell>
      <TableCell>
        <Badge variant={post.published ? "success" : "secondary"}>
          {post.published ? "Đã xuất bản" : "Nháp"}
        </Badge>
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={onToggleFeatured}
          disabled={isToggling}
          className="inline-flex items-center rounded-md disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={post.featured ? "Bỏ ưu tiên" : "Đánh dấu ưu tiên"}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : post.featured ? (
            <Badge variant="default">Ưu tiên</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/posts/${post.id}/edit`}>
            <Button variant="outline" size="sm">
              Sửa
            </Button>
          </Link>
          <DeletePostButton
            postId={post.id}
            postTitle={post.title}
            onDeleted={onDeleted}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function AdminPostsTable() {
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    posts,
    hasMore,
    loading,
    loadingMore,
    error,
    reload,
    removeItem,
    reorderPosts,
    toggleFeatured,
    togglingIds,
    sentinelRef,
  } = usePostsInfiniteList({ featuredOnly, query: debouncedQuery });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const clearSearch = () => {
    setQuery("");
    setIsSearchOpen(false);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = posts.findIndex((post) => post.id === active.id);
    const newIndex = posts.findIndex((post) => post.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    void reorderPosts(arrayMove(posts, oldIndex, newIndex));
  };

  const showInitialError = error && posts.length === 0 && !loading;
  const isFiltering = Boolean(debouncedQuery) || featuredOnly;

  return (
    <Card>
      <CardContent className="p-0">
        {showInitialError ? (
          <div className="mb-0 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isFiltering && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Chưa có bài đăng nào.</p>
            <Link href="/admin/posts/new" className="mt-4 inline-block">
              <Button>Tạo bài đăng đầu tiên</Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-hidden />
                <TableHead className="min-w-[160px]">
                  {isSearchOpen ? (
                    <div className="relative flex items-center">
                      <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onBlur={() => setIsSearchOpen(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        placeholder="Tìm theo tiêu đề..."
                        className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-7 text-xs font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      {query ? (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={clearSearch}
                          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Xoá tìm kiếm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(true)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:bg-muted",
                        query && "text-primary",
                      )}
                    >
                      Tiêu đề
                      <Search
                        className={cn(
                          "h-3.5 w-3.5",
                          !query && "text-muted-foreground",
                        )}
                      />
                    </button>
                  )}
                </TableHead>
                <TableHead className="hidden md:table-cell">Địa chỉ</TableHead>
                <TableHead className="hidden sm:table-cell">Concept</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setFeaturedOnly((prev) => !prev)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:bg-muted",
                      featuredOnly && "text-primary",
                    )}
                    aria-pressed={featuredOnly}
                  >
                    Ưu tiên
                    <Filter
                      className={cn(
                        "h-3.5 w-3.5",
                        featuredOnly ? "fill-current" : "text-muted-foreground",
                      )}
                    />
                  </button>
                </TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={posts.map((post) => post.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={TABLE_COLUMN_COUNT}
                        className="py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          {debouncedQuery ? (
                            <>
                              <p className="text-muted-foreground">
                                Không tìm thấy bài đăng nào khớp với &ldquo;
                                {debouncedQuery}&rdquo;.
                              </p>
                              <Button variant="outline" onClick={clearSearch}>
                                Xoá tìm kiếm
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground">
                                Chưa có bài đăng nào được ưu tiên.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setFeaturedOnly(false)}
                              >
                                Bỏ lọc
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <SortablePostRow
                        key={post.id}
                        post={post}
                        onDeleted={() => removeItem(post.id)}
                        onToggleFeatured={() => void toggleFeatured(post.id)}
                        isToggling={togglingIds.has(post.id)}
                      />
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
        )}

        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {loadingMore ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : !hasMore && posts.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              Đã tải hết danh sách
            </span>
          ) : null}
        </div>

        {error && posts.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              Thử lại
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
