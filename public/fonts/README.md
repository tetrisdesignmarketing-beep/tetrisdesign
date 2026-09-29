# Font files

Đặt file font brand vào đây (theo `DECISIONS.md`):

| Font | File |
|------|------|
| Fashion Didot W90 Regular (logo) | `FashionDidotW90-Regular.woff2` |
| Neue Einstellung Regular 400 — chữ thường | `NeueEinstellung-Regular.woff2` |
| Neue Einstellung Medium 500 — label, menu | `NeueEinstellung-Medium.woff2` |
| Neue Einstellung Bold 700 | `NeueEinstellung-Bold.woff2` |

UI đang dùng Neue Einstellung (Hanken Design Co. — cần Web Font License cho
domain). Bộ gốc có đủ 9 độ đậm; chỉ đóng gói 400/500/700.

Font cũ vẫn để lại để đổi lại nếu cần: Gotham (`Gotham-*.woff2`),
Ganh (`Ganh-*.woff2`), Helvetica Neue (`HelveticaNeue-*.woff2`).

Đường dẫn trong CSS: `/fonts/{filename}` — xem `@font-face` trong `src/app/globals.css`.

Preload trong `src/app/layout.tsx`: `NeueEinstellung-Regular.woff2` và `NeueEinstellung-Medium.woff2`.
