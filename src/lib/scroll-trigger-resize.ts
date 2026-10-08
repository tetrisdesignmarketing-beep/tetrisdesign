"use client";

/**
 * Gọi `callback` (debounce) chỉ khi CHIỀU RỘNG cửa sổ đổi — vd. xoay máy,
 * kéo cửa sổ desktop. Không phản ứng khi chỉ chiều cao đổi: trên iPhone thanh
 * địa chỉ thu/giãn bắn `resize` liên tục lúc cuộn; gọi ScrollTrigger.refresh()
 * khi đó bắt GSAP đo lại cả trang GIỮA lúc cuộn → khựng.
 * Trả về hàm huỷ đăng ký.
 */
export function onWidthResize(callback: () => void, delayMs = 150): () => void {
  let lastWidth = window.innerWidth;
  let timer = 0;
  const onResize = () => {
    const width = window.innerWidth;
    if (width === lastWidth) return;
    lastWidth = width;
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, delayMs);
  };
  window.addEventListener("resize", onResize);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("resize", onResize);
  };
}
