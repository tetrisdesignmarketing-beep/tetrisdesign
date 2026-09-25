# Font files

Đặt file font brand vào đây (theo `DECISIONS.md`):

| Font | File đề xuất |
|------|----------------|
| Fashion Didot W90 Regular | `FashionDidotW90-Regular.woff2` |
| Helvetica Neue (Regular 400) | `HelveticaNeue-Regular.woff2` |
| Helvetica Neue (Medium 500) | `HelveticaNeue-Medium.woff2` |
| Helvetica Neue (Bold 700) | `HelveticaNeue-Bold.woff2` |
| Helvetica Neue (Italic 400) | `HelveticaNeue-Italic.woff2` |
| Helvetica Neue (Bold Italic 700) | `HelveticaNeue-BoldItalic.woff2` |

Đường dẫn trong CSS: `/fonts/{filename}` — xem `@font-face` trong `src/app/globals.css`.

Sau khi thêm font, có thể preload trong `src/app/layout.tsx`:

```tsx
<link rel="preload" href="/fonts/HelveticaNeue-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
<link rel="preload" href="/fonts/HelveticaNeue-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
```

Nếu tên file khác, cập nhật `@font-face` tương ứng.
