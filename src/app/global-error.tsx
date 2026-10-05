"use client";

/**
 * Lỗi ở root layout (không dùng được layout/CSS của site) → trang tối giản,
 * tự có <html>/<body>, style inline.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          color: "#231f20",
          background: "#fff",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p style={{ letterSpacing: "0.3em", textTransform: "uppercase" }}>
          TETRIS DESIGN
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 500, margin: 0 }}>
          Đã có lỗi xảy ra
        </h1>
        <p style={{ margin: 0, color: "#6b6b6b" }}>
          Vui lòng thử lại sau ít phút.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "1px solid #231f20",
            background: "none",
            padding: "0.75rem 1.25rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Thử lại
        </button>
      </body>
    </html>
  );
}
