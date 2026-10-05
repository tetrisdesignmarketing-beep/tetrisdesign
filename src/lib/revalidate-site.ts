import { revalidatePath } from "next/cache";

/**
 * Trang public được lưu sẵn (ISR, `export const revalidate` ở từng page).
 * Admin lưu dữ liệu xong → gọi hàm này để đánh dấu TOÀN BỘ trang public cần
 * dựng lại; lượt xem kế tiếp của mỗi trang sẽ lấy dữ liệu mới.
 *
 * Làm mới cả site thay vì từng path: dữ liệu dùng chéo nhiều trang (liên hệ ở
 * footer mọi trang, dự án ở /projects + chi tiết + "Các dự án khác", media ở
 * mọi nơi…) và site nhỏ nên dựng lại hết vẫn rẻ.
 * Chỉ gọi được ở server (Route Handler / Server Function).
 */
export function revalidateSite() {
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    /* Không để lỗi làm mới cache làm hỏng phản hồi lưu dữ liệu của admin. */
    console.error("revalidateSite failed:", error);
  }
}
