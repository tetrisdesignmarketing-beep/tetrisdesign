"use client";

import "./news-editor.css";
import { type ReactNode, useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TipTapDoc } from "@/lib/validations/news";

/**
 * Ô soạn đoạn văn của bài tin. Chỉ bật các định dạng mà trang public hiển thị
 * được (components/site/news-content.tsx): đậm, nghiêng, gạch chân, gạch
 * ngang, H2/H3, danh sách, trích dẫn, link.
 */
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["http", "https", "mailto", "tel"],
    },
  }),
  Placeholder.configure({ placeholder: "Nhập nội dung đoạn văn…" }),
];

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      /* Giữ vùng chọn trong ô soạn khi bấm nút. */
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-foreground text-background hover:bg-foreground hover:text-background",
      )}
    >
      {children}
    </button>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Đường dẫn (để trống để bỏ link):", previous ?? "https://");
  if (url === null) return;
  const chain = editor.chain().focus().extendMarkRange("link");
  if (url.trim() === "" || url.trim() === "https://") chain.unsetLink().run();
  else chain.setLink({ href: url.trim() }).run();
}

export function NewsRichText({
  value,
  onChange,
}: {
  value: TipTapDoc;
  onChange: (doc: TipTapDoc) => void;
}) {
  /* Editor tạo 1 lần — gọi onChange mới nhất qua ref (tránh closure cũ). */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    /* Nút trên thanh công cụ cần biết định dạng tại con trỏ. */
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) =>
      onChangeRef.current(current.getJSON() as TipTapDoc),
  });

  const icon = "h-4 w-4";
  return (
    <div className="news-rte overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
        {editor ? (
          <>
            <ToolbarButton label="Đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <Underline className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Gạch ngang" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className={icon} />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <ToolbarButton label="Tiêu đề lớn (H2)" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Tiêu đề nhỏ (H3)" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Danh sách chấm" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Danh sách số" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Trích dẫn" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Chèn / sửa link" active={editor.isActive("link")} onClick={() => setLink(editor)}>
              <Link2 className={icon} />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <ToolbarButton label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 className={icon} />
            </ToolbarButton>
            <ToolbarButton label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 className={icon} />
            </ToolbarButton>
          </>
        ) : (
          <span className="h-8" />
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
