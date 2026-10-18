# Font files

Đặt file font brand vào đây (theo `DECISIONS.md`):

| Font | File |
|------|------|
| Fashion Didot W90 Regular (logo) | `FashionDidotW90-Regular.woff2` |
| Darker Grotesque 400 / 500 / 600 / 700 — UI chính (SIL OFL, `DarkerGrotesque-OFL.txt`) | `DarkerGrotesque-{Regular,Medium,SemiBold,Bold}.woff2` |
| Neue Einstellung Regular 400 — dự phòng | `NeueEinstellung-Regular.woff2` |
| Neue Einstellung Medium 500 — label, menu | `NeueEinstellung-Medium.woff2` |
| Neue Einstellung Bold 700 | `NeueEinstellung-Bold.woff2` |

UI đang dùng Neue Einstellung (Hanken Design Co. — cần Web Font License cho
domain). Bộ gốc có đủ 9 độ đậm; chỉ đóng gói 400/500/700.

Font cũ (Gotham, Ganh, Helvetica Neue) đã xoá khỏi thư mục — cần đổi lại thì
lấy từ lịch sử git.

Đường dẫn trong CSS: `/fonts/{filename}` — xem `@font-face` trong `src/app/globals.css`.

Preload trong `src/app/layout.tsx`: `DarkerGrotesque-Regular.woff2` và `DarkerGrotesque-Medium.woff2`.
