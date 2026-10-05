/**
 * Xếp hàng ảnh cho gallery chi tiết dự án LAYOUTDEFAULT (desktop).
 * Tách khỏi component để test được (tests/project-gallery-rows.test.ts).
 */

/** Rộng/cao < 0.9 → ảnh dọc. Gần vuông (0.9–1.1) coi như ngang (full width). */
export const PORTRAIT_MAX_RATIO = 0.9;

export type GalleryItem = {
  src: string;
  /** Vị trí gốc theo thứ tự admin (mobile hiển thị theo thứ tự này). */
  sourceIndex: number;
  /** Rộng/cao; null = chưa biết. */
  ratio: number | null;
};

export type GalleryRow =
  | { kind: "single"; items: [GalleryItem] }
  | { kind: "pair"; items: [GalleryItem, GalleryItem] };

export function isPortrait(item: GalleryItem) {
  return item.ratio !== null && item.ratio < PORTRAIT_MAX_RATIO;
}

/**
 * Desktop: ảnh ngang = 1 hàng full; ảnh dọc luôn ghép cặp với ảnh dọc gần nhất
 * phía sau (bỏ qua ảnh ngang ở giữa) → thứ tự hiển thị có thể khác thứ tự
 * admin. Ảnh dọc lẻ cuối cùng → ghép với hàng ảnh ngang liền trước (hoặc liền
 * sau) thành 1 hàng "justified" (cùng chiều cao, rộng theo tỷ lệ) để vẫn phủ
 * kín chiều ngang mà không cắt; chỉ khi không có hàng đơn kề bên mới đứng riêng.
 */
export function buildRows(items: GalleryItem[]): GalleryRow[] {
  const rows: GalleryRow[] = [];
  let openPair: GalleryRow | null = null;
  for (const item of items) {
    if (!isPortrait(item)) {
      rows.push({ kind: "single", items: [item] });
      continue;
    }
    if (openPair && openPair.kind === "single") {
      const first = openPair.items[0];
      const index = rows.indexOf(openPair);
      rows[index] = { kind: "pair", items: [first, item] };
      openPair = null;
      continue;
    }
    openPair = { kind: "single", items: [item] };
    rows.push(openPair);
  }

  if (openPair) {
    const lone = openPair.items[0];
    const index = rows.indexOf(openPair);
    const prev = rows[index - 1];
    const next = rows[index + 1];
    if (prev?.kind === "single") {
      rows.splice(index - 1, 2, { kind: "pair", items: [prev.items[0], lone] });
    } else if (next?.kind === "single") {
      rows.splice(index, 2, { kind: "pair", items: [lone, next.items[0]] });
    }
  }
  return rows;
}

/** Phần chiều ngang của 1 ảnh trong hàng ghép = tỷ lệ ảnh / tổng tỷ lệ hàng. */
export function pairShareOf(items: GalleryItem[], item: GalleryItem) {
  const total = items.reduce((sum, it) => sum + (it.ratio ?? 1), 0);
  return total > 0 ? (item.ratio ?? 1) / total : 1 / items.length;
}

/**
 * `sizes` của ảnh trong gallery: hàng ghép chiếm `pairShare` chiều ngang ở
 * desktop. Dùng chung cho component và lệnh preload phía server (phải khớp
 * để trình duyệt dùng lại ảnh đã preload).
 */
export function gallerySizes(pairShare?: number): string {
  return pairShare === undefined
    ? "100vw"
    : `(min-width: 1024px) ${Math.ceil(pairShare * 100)}vw, 100vw`;
}
