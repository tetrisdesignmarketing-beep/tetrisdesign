import { Fragment, type ReactNode } from "react";

/**
 * Chữ đậm trong đoạn văn trơn (admin nhập `**chữ đậm**`). Chỉ hỗ trợ đậm —
 * không phải Markdown đầy đủ. Cặp `**` lẻ / rỗng giữ nguyên dạng chữ.
 */
const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

/** Bỏ dấu `**` (dùng cho hiệu ứng chữ cái / nơi chỉ nhận chuỗi). */
export function stripInlineBold(text: string): string {
  return text.replace(BOLD_PATTERN, "$1");
}

/** Chuỗi → nút React: đoạn thường xen `<strong>` (đậm 700, giữ màu chữ cha). */
export function renderInlineBold(text: string): ReactNode {
  const parts = text.split(BOLD_PATTERN);
  if (parts.length === 1) return text;
  /* split với 1 nhóm bắt: chỉ số lẻ = phần nằm trong ** **. */
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-bold">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
