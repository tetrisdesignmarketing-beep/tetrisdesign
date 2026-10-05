/* Next 16: file convention `middleware` đổi tên thành `proxy` (Node.js runtime). */
export { auth as proxy } from "@/auth";

export const config = {
  // `/admin/:path*` không khớp đúng `/admin` — thiếu matcher này thì chưa login ra trang trắng
  matcher: ["/admin", "/admin/:path*"],
};
