import type { ReactNode } from "react";
import { ProgressiveImage } from "@/components/site/progressive-image";
import {
  CANVAS_FULL_WIDTH,
  CANVAS_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import type { NewsBlock, TipTapNode } from "@/lib/validations/news";

/**
 * Hiển thị nội dung bài tin (danh sách khối) — không dùng HTML thô:
 * chỉ các node / mark TipTap đã biết được dựng thành React (tự escape),
 * loại lạ bị bỏ qua, link chỉ nhận http(s) / mailto / tel / đường dẫn nội bộ.
 */
function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  return null;
}

function renderText(node: TipTapNode, key: string): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (href) {
          const external = /^https?:/i.test(href);
          out = (
            <a
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {out}
            </a>
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return <span key={key}>{out}</span>;
}

function renderNodes(nodes: TipTapNode[] | undefined, prefix: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, `${prefix}-${index}`));
}

function renderNode(node: TipTapNode, key: string): ReactNode {
  const children = renderNodes(node.content, key);
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      /* Đoạn trống (Enter 2 lần) → giữ khoảng cách như khi soạn. */
      return (
        <p key={key} className="ts-body">
          {children.length > 0 ? children : <br />}
        </p>
      );
    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      return level === 3 ? (
        <h3 key={key} className="ts-heading">
          {children}
        </h3>
      ) : (
        <h2 key={key} className="ts-heading">
          {children}
        </h2>
      );
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    default:
      return null;
  }
}

export function NewsContent({ blocks }: { blocks: readonly NewsBlock[] }) {
  return (
    <div className="news-content">
      {blocks.map((block) =>
        block.type === "text" ? (
          <div key={block.id} className="news-content__text">
            {renderNodes(block.doc.content, block.id)}
          </div>
        ) : (
          <figure
            key={block.id}
            className="news-content__figure"
            data-align={block.align}
            style={{ "--news-img-w": `${block.width}%` } as React.CSSProperties}
          >
            <ProgressiveImage
              src={block.src}
              alt={block.alt || block.caption}
              previewWidth={CANVAS_PREVIEW_WIDTH}
              fullWidth={CANVAS_FULL_WIDTH}
              fullResponsive
              layout="flow"
              loading="lazy"
              sizes="(min-width: 860px) 820px, 100vw"
            />
            {block.caption ? (
              <figcaption className="ts-caption">{block.caption}</figcaption>
            ) : null}
          </figure>
        ),
      )}
    </div>
  );
}
