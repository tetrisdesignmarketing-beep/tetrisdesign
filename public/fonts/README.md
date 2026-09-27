# Font files

Đặt file font brand vào đây (theo `DECISIONS.md`):

| Font | File |
|------|------|
| Fashion Didot W90 Regular | `FashionDidotW90-Regular.woff2` |
| Ganh (Thin 100) — UI tạm | `Ganh-Thin.woff2` |
| Ganh (Thin Italic 100) | `Ganh-ThinItalic.woff2` |
| Ganh (Regular 400; CSS cũng gán 500 và 700) | `Ganh-Regular.woff2` |
| Ganh (Italic 400) | `Ganh-Italic.woff2` |

Helvetica Neue (`HelveticaNeue-*.woff2`) vẫn nằm trong thư mục để đổi lại. UI đang dùng Ganh.

Đường dẫn trong CSS: `/fonts/{filename}` — xem `@font-face` trong `src/app/globals.css`.

Preload trong `src/app/layout.tsx`:

```tsx
<link rel="preload" href="/fonts/Ganh-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
```
