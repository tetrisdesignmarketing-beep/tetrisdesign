export const MEDIA_TITLE_MAX = 200;
export const MEDIA_TITLE_CONFLICT_ERROR = "Title ảnh đã tồn tại";

const INDEXED_TITLE_RE = /^(.*)_(\d+)$/;

export type PendingUploadTitle = {
  id: string;
  title: string;
  dirty: boolean;
};

export type MediaTitleConflict = {
  index: number;
  title: string;
  suggested: string;
};

export function padTitleIndex(index1based: number, width = 2) {
  return String(index1based).padStart(Math.max(width, 2), "0");
}

export function clipMediaTitle(value: string) {
  return value.slice(0, MEDIA_TITLE_MAX);
}

/** Title lấy từ tên file: bỏ phần mở rộng (".jpg"…); tên chỉ có đuôi → giữ nguyên. */
export function fileNameToMediaTitle(fileName: string) {
  const base = fileName.replace(/\.[^./\\]+$/, "").trim();
  return clipMediaTitle(base || fileName.trim());
}

export function applySeedTitles<T extends PendingUploadTitle>(
  pending: T[],
  seedId: string,
  base: string,
): T[] {
  const trimmed = base.trim();
  const clippedBase = clipMediaTitle(base);

  if (pending.length <= 1) {
    return pending.map((item) =>
      item.id === seedId ? { ...item, title: clippedBase } : item,
    );
  }

  let sequence = 0;
  return pending.map((item) => {
    if (item.id === seedId) {
      return { ...item, title: clippedBase };
    }
    if (!trimmed) {
      return { ...item, title: "" };
    }
    sequence += 1;
    return {
      ...item,
      title: clipMediaTitle(`${trimmed}_${padTitleIndex(sequence)}`),
    };
  });
}

export function updatePendingTitle<T extends PendingUploadTitle>(
  pending: T[],
  itemId: string,
  value: string,
): T[] {
  const clipped = clipMediaTitle(value);
  if (!pending.some((item) => item.id === itemId)) return pending;
  return pending.map((item) =>
    item.id === itemId ? { ...item, title: clipped, dirty: true } : item,
  );
}

export function commitSeedTitle<T extends PendingUploadTitle>(
  pending: T[],
  itemId: string,
): { pending: T[]; seedId: string | null; committed: boolean } {
  const item = pending.find((entry) => entry.id === itemId);
  if (!item || !item.title.trim()) {
    return { pending, seedId: null, committed: false };
  }

  return {
    pending: applySeedTitles(pending, itemId, item.title),
    seedId: itemId,
    committed: true,
  };
}

export function normalizeMediaTitle(title: string) {
  return title.trim().toLowerCase();
}

function parseIndexedTitle(title: string) {
  const trimmed = title.trim();
  const match = trimmed.match(INDEXED_TITLE_RE);
  if (!match) {
    return { prefix: trimmed, attempted: null as number | null, width: 2 };
  }
  return {
    prefix: match[1],
    attempted: Number(match[2]),
    width: match[2].length,
  };
}

export function suggestUniqueMediaTitle(title: string, taken: Set<string>) {
  const { prefix, attempted, width } = parseIndexedTitle(title);
  let next = attempted === null ? 1 : attempted + 1;
  const limit = next + 10_000;

  while (next < limit) {
    const candidate = clipMediaTitle(`${prefix}_${padTitleIndex(next, width)}`);
    if (!taken.has(normalizeMediaTitle(candidate))) {
      return candidate;
    }
    next += 1;
  }

  return clipMediaTitle(`${prefix}_${Date.now()}`);
}

export function findDuplicateTitleConflicts(
  incoming: string[],
  existing: string[],
): MediaTitleConflict[] {
  const existingKeys = new Set(
    existing.map(normalizeMediaTitle).filter(Boolean),
  );
  const seen = new Set(existingKeys);
  const conflictIndexes: number[] = [];

  incoming.forEach((raw, index) => {
    const key = normalizeMediaTitle(raw);
    if (!key) return;
    if (seen.has(key)) {
      conflictIndexes.push(index);
      return;
    }
    seen.add(key);
  });

  const conflictIndexSet = new Set(conflictIndexes);

  const reserved = new Set(existingKeys);
  incoming.forEach((raw, index) => {
    if (conflictIndexSet.has(index)) return;
    const key = normalizeMediaTitle(raw);
    if (key) reserved.add(key);
  });

  return conflictIndexes.map((index) => {
    const title = incoming[index]?.trim() ?? "";
    const suggested = suggestUniqueMediaTitle(title, reserved);
    reserved.add(normalizeMediaTitle(suggested));
    return { index, title, suggested };
  });
}

export function applyTitleConflicts<T extends PendingUploadTitle>(
  pending: T[],
  conflicts: MediaTitleConflict[],
): T[] {
  if (!conflicts.length) return pending;
  const byIndex = new Map(conflicts.map((conflict) => [conflict.index, conflict]));
  return pending.map((item, index) => {
    const hit = byIndex.get(index);
    if (!hit) return item;
    return {
      ...item,
      title: clipMediaTitle(hit.suggested),
      dirty: true,
    };
  });
}
