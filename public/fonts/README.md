# Font files

Đặt file font brand vào đây (theo `DECISIONS.md`):

| Font | File đề xuất |
|------|----------------|
| Fashion Didot W90 Regular | `FashionDidotW90-Regular.woff2` |
| Gilroy (Regular 400) | `Gilroy-Regular.woff2` |
| Gilroy (Medium 500) | `Gilroy-Medium.woff2` |
| Gilroy (SemiBold 600) | `Gilroy-SemiBold.woff2` |
| Gilroy (Bold 700) | `Gilroy-Bold.woff2` |
| Gilroy (Italic 400) | `Gilroy-Italic.woff2` |
| Gilroy (Bold Italic 700) | `Gilroy-BoldItalic.woff2` |

Đường dẫn trong CSS: `/fonts/{filename}` — xem `@font-face` trong `src/app/globals.css`.

Sau khi thêm font, có thể preload trong `src/app/layout.tsx`:

```tsx
<link rel="preload" href="/fonts/Gilroy-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
```

Nếu tên file khác, cập nhật `@font-face` tương ứng.
