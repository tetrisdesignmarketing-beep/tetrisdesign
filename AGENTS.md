<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project docs (đọc trước khi code)

- [docs/architecture/DECISIONS.md](docs/architecture/DECISIONS.md) — **quyết định đã chốt** (đọc trước)
- [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) — kiến trúc, stack, routing
- [docs/architecture/CONVENTIONS.md](docs/architecture/CONVENTIONS.md) — naming, patterns, styling; **Single source of truth** (tránh hardcode layout/header)
- [docs/architecture/FULL-PAGE-SCROLL.md](docs/architecture/FULL-PAGE-SCROLL.md) — **virtual pager** (About ✅): hooks `use-section-*`, section modes
- **Cuộn native** (2026-09) — Home chỉ còn slider; About, Services, Projects cuộn document bình thường; virtual pager chỉ còn ở chi tiết dự án LAYOUT2. Không thêm Lenis/Locomotive; JS chỉ đọc vị trí cuộn ([DECISIONS](docs/architecture/DECISIONS.md#full-page-scroll--landing-pages-đã-thay-thế--xem-ghi-chú))

## Tooling

- **Không dùng Codegraph** — dùng Grep, Read, Glob để explore code.

## Design → implementation

- **Design system:** [docs/design/MASTER.md](docs/design/MASTER.md) — màu, chữ, khoảng cách, ảnh, **motion tokens** (`--ease-*`, `--motion-*`), checklist a11y trước khi bàn giao (đọc trước khi sửa UI)
- Ảnh layout landing: `docs/design/landing/`
- File phân tích từ mockup: `docs/design/landing/analysis/`
- Skill phân tích design: `.cursor/skills/analyze-design/` (dùng khi user thêm ảnh hoặc yêu cầu phân tích layout)
- Skill animation landing: `.cursor/skills/site-animation/` (scroll-driven, enter-once, brand-break, không phá Home curtain/hero)
- **Layout động:** offset header, scroll anchor, spacing dưới menu — **không hardcode**; dùng `getHeaderOffset()` / `--site-header-height` ([CONVENTIONS](docs/architecture/CONVENTIONS.md#single-source-of-truth--tránh-hardcode-layout-bắt-buộc))
- **Home hero touch/scroll** + **Project curtain animation** — 2 hiệu ứng **bắt buộc giữ** (Home section paging A↔B đã bỏ 2026-09) — xem [DECISIONS.md](docs/architecture/DECISIONS.md#trang-chủ--2-hiệu-ứng-bắt-buộc-tóm-tắt); helper: `src/lib/home-scroll.ts`
