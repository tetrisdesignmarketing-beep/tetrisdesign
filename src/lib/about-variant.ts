/**
 * Biến thể cuộn của trang Giới thiệu:
 * - `pin` (đang dùng ở /about): ghim ảnh + thu nhỏ theo cuộn, logo đỏ bám theo cuộn.
 * - `timed-logo` (phương án B, giữ lại trong code — hiện chưa có trang nào dùng):
 *   giữ ghim, logo đỏ kích hoạt theo vị trí cuộn + chạy theo thời gian cố định.
 *   Bật: truyền `variant="timed-logo"` cho <AboutPageScroll /> ở (site)/about/page.tsx.
 */
export type AboutScrollVariant = "pin" | "timed-logo";
