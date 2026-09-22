import Link from "next/link";
import { CONTACT_MAP_PIN } from "@/lib/contact-map-config";
import {
  getContactMapEmbedSrc,
  getContactMapsUrl,
} from "@/lib/contact-map-embed";
import { cn } from "@/lib/utils";

interface ContactMapEmbedSectionProps {
  /** Địa chỉ CMS — sinh iframe + link pin */
  address: string;
  className?: string;
}

export function ContactMapEmbedSection({
  address,
  className,
}: ContactMapEmbedSectionProps) {
  const { src, provider } = getContactMapEmbedSrc(address);
  const mapsUrl = getContactMapsUrl(address);

  return (
    <section className={cn("w-full", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted md:aspect-[21/9]">
        {/* pointer-events-none: iOS/Android iframe nuốt touch → pin không bấm được */}
        <iframe
          title="Vị trí Tetris Design trên bản đồ"
          src={src}
          className="pointer-events-none absolute inset-0 h-full w-full border-0 grayscale"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
          aria-hidden
        />
        {provider === "osm" && (
          <div className="pointer-events-none absolute inset-0 bg-foreground/5" />
        )}

        {/* Google iframe kiểu output=embed tự vẽ icon "phóng to toàn màn hình" ở
            góc dưới-phải, không có tham số nào tắt được (khác Maps Embed API
            chính thức). Đã pointer-events-none nên nút này vốn không bấm được —
            che nó đi bằng 1 lớp phủ mờ viền để không hiện icon thừa trên UI. */}
        {provider === "google-query" && (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 z-10 h-16 w-16 bg-muted blur-md"
          />
        )}

        {/* Marker mặc định của Google (đầu mũi pin) không nằm đúng tâm hình học
            của iframe — lệch xuống dưới ~14px (đo thực tế trên output=embed,
            khả năng do khối "place card" phía trên chiếm chỗ). Lớp phủ mờ nhỏ
            này che phần đuôi pin thật lộ ra dưới pin custom, phòng khi nudge
            bên dưới chưa khớp tuyệt đối ở mọi kích thước màn hình. */}
        {provider === "google-query" && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-6 w-6 -translate-x-1/2 translate-y-[2px] rounded-full bg-muted blur-[6px]"
          />
        )}

        {/* Pin + vùng chạm ≥44px — mở Google Maps / app chỉ đường.
            -translate-y-[calc(100%-14px)] thay vì -translate-y-full: dịch mũi
            pin xuống ~14px để khớp với vị trí marker thật của Google (xem
            ghi chú lớp phủ phía trên). */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-[calc(100%-14px)] flex-col items-center gap-1 p-3 touch-manipulation"
          aria-label={`${address} — mở Google Maps`}
        >
          <span className="rounded-sm bg-background px-2 py-0.5 text-[11px] font-medium tracking-wide text-foreground shadow-sm">
            Tetris
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG pin tĩnh public */}
          <img
            src={CONTACT_MAP_PIN.src}
            width={CONTACT_MAP_PIN.width}
            height={CONTACT_MAP_PIN.height}
            alt=""
            draggable={false}
            className="drop-shadow-md"
          />
        </a>
      </div>

      <p className="mx-auto max-w-6xl px-4 pt-3 text-center">
        <Link
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center px-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors touch-manipulation hover:text-brand-red"
        >
          Mở Google Maps →
        </Link>
      </p>
    </section>
  );
}
