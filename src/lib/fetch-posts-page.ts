export type AdminPostListItem = {
  id: string;
  title: string;
  address: string;
  concept: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  category: { name: string } | null;
};

export type PostListResponse = {
  items: AdminPostListItem[];
  nextCursor: string | null;
};

async function parseErrorMessage(res: Response, fallback: string) {
  const payload: unknown = await res.json().catch(() => null);
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export function buildPostsListParams(options: {
  cursor?: string | null;
  limit?: number;
  featuredOnly?: boolean;
  query?: string;
}) {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.featuredOnly) params.set("featured", "true");
  if (options.query?.trim()) params.set("q", options.query.trim());
  return params;
}

export async function fetchPostsPage(options: {
  cursor?: string | null;
  limit?: number;
  featuredOnly?: boolean;
  query?: string;
}): Promise<PostListResponse> {
  const res = await fetch(
    `/api/posts?${buildPostsListParams(options).toString()}`,
  );

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Không thể tải bài đăng"));
  }

  const payload: unknown = await res.json().catch(() => null);
  if (
    !payload ||
    typeof payload !== "object" ||
    !("items" in payload) ||
    !Array.isArray(payload.items)
  ) {
    throw new Error("Không thể tải bài đăng");
  }

  const nextCursor =
    "nextCursor" in payload && typeof payload.nextCursor === "string"
      ? payload.nextCursor
      : null;

  return {
    items: payload.items as AdminPostListItem[],
    nextCursor,
  };
}

/** Lưu thứ tự kéo thả — `orderedIds` = id các bài đang tải, theo thứ tự mới. */
export async function patchPostsReorder(orderedIds: string[]): Promise<void> {
  const res = await fetch("/api/posts/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Không thể lưu thứ tự mới"));
  }
}

/** Bật/tắt ưu tiên trực tiếp từ bảng quản lý. */
export async function patchPostFeatured(
  id: string,
  featured: boolean,
): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ featured }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Không thể cập nhật ưu tiên"));
  }
}
