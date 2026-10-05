/**
 * Biến thể cuộn của trang Giới thiệu (để so sánh trên điện thoại):
 * - `pin`: hiện tại — ghim ảnh + thu nhỏ theo cuộn, logo đỏ bám theo cuộn (/about).
 * - `flow-mobile`: phương án A — mobile bỏ ghim/thu nhỏ, ảnh trong luồng trang (/about1).
 * - `timed-logo`: phương án B — giữ ghim, logo kích hoạt theo vị trí + chạy theo thời gian (/about2).
 */
export type AboutScrollVariant = "pin" | "flow-mobile" | "timed-logo";

/** Tỷ lệ rộng/cao ảnh (biết trước từ DB) — khung ảnh đúng tỷ lệ ngay khung hình đầu. */
export interface AboutImageRatios {
  hero?: number;
  brandBreak?: number;
}
