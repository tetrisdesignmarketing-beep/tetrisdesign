"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  GripVertical,
  ImageIcon,
  ImagePlus,
  Pilcrow,
  Trash2,
} from "lucide-react";
import { useMediaDrawer } from "@/components/admin/media-drawer-context";
import { NewsRichText } from "@/components/admin/news-rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  NEWS_IMAGE_MAX_WIDTH,
  NEWS_IMAGE_MIN_WIDTH,
  type NewsBlock,
  type NewsImageAlign,
  type NewsImageBlock,
} from "@/lib/validations/news";

function newBlockId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newTextBlock(): NewsBlock {
  return { id: newBlockId(), type: "text", doc: { type: "doc", content: [] } };
}

const ALIGN_OPTIONS: Array<{
  value: NewsImageAlign;
  label: string;
  icon: ReactNode;
}> = [
  { value: "left", label: "Căn trái", icon: <AlignLeft className="h-4 w-4" /> },
  { value: "center", label: "Căn giữa", icon: <AlignCenter className="h-4 w-4" /> },
  { value: "right", label: "Căn phải", icon: <AlignRight className="h-4 w-4" /> },
];

function SortableBlock({
  id,
  label,
  onRemove,
  children,
}: {
  id: string;
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "space-y-3 rounded-md border bg-background p-3",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Kéo để đổi vị trí khối"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="mr-auto text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          aria-label="Xoá khối"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function ImageBlockFields({
  block,
  onChange,
}: {
  block: NewsImageBlock;
  onChange: (next: NewsImageBlock) => void;
}) {
  const { openMedia } = useMediaDrawer();
  const pick = () =>
    openMedia({
      accept: "image",
      onPick: (item) => onChange({ ...block, src: item.url }),
    });

  return (
    <div className="space-y-4">
      {/* Xem trước đúng độ rộng / căn lề như trang bài (khung ~ cột nội dung). */}
      <div className="rounded-md bg-muted/40 p-3">
        <figure
          className="mx-auto"
          style={
            {
              width: `${block.width}%`,
              marginLeft: block.align === "left" ? 0 : "auto",
              marginRight: block.align === "right" ? 0 : "auto",
            } as CSSProperties
          }
        >
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.alt} className="block h-auto w-full" />
          ) : (
            <button
              type="button"
              onClick={pick}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:border-foreground/40"
            >
              <ImageIcon className="h-6 w-6" />
              Chọn ảnh từ Media
            </button>
          )}
          {block.caption ? (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label htmlFor={`news-img-w-${block.id}`}>
            Độ rộng ảnh: <span className="font-semibold">{block.width}%</span>
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (điện thoại luôn 100%)
            </span>
          </Label>
          <input
            id={`news-img-w-${block.id}`}
            type="range"
            min={NEWS_IMAGE_MIN_WIDTH}
            max={NEWS_IMAGE_MAX_WIDTH}
            step={5}
            value={block.width}
            onChange={(event) =>
              onChange({ ...block, width: Number(event.target.value) })
            }
            className="w-full accent-[#6f1114]"
          />
        </div>
        <div className="space-y-2">
          <Label>Căn lề</Label>
          <div className="flex gap-1">
            {ALIGN_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="icon"
                variant={block.align === option.value ? "default" : "outline"}
                aria-pressed={block.align === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => onChange({ ...block, align: option.value })}
              >
                {option.icon}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`news-img-caption-${block.id}`}>Chú thích (tuỳ chọn)</Label>
          <Input
            id={`news-img-caption-${block.id}`}
            value={block.caption}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`news-img-alt-${block.id}`}>Mô tả ảnh (alt, cho SEO)</Label>
          <Input
            id={`news-img-alt-${block.id}`}
            value={block.alt}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </div>
      </div>

      {block.src ? (
        <Button type="button" variant="outline" size="sm" onClick={pick}>
          Đổi ảnh
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Nội dung bài tin: danh sách khối đoạn văn / ảnh — thêm, xoá, kéo-thả.
 * Trang public hiển thị đúng thứ tự này.
 */
export function NewsContentEditor({
  value,
  onChange,
}: {
  value: NewsBlock[];
  onChange: (next: NewsBlock[]) => void;
}) {
  // Stable id so dnd-kit's aria-describedby matches between SSR and hydration.
  const dndId = useId();
  const { openMedia } = useMediaDrawer();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (id: string, next: NewsBlock) =>
    onChange(value.map((block) => (block.id === id ? next : block)));
  const remove = (id: string) => onChange(value.filter((block) => block.id !== id));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = value.findIndex((block) => block.id === active.id);
    const to = value.findIndex((block) => block.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(value, from, to));
  };

  /* Thêm ảnh: chọn ngay từ Media, rồi mới tạo khối (không để khối ảnh trống). */
  const addImage = () =>
    openMedia({
      accept: "image",
      onPick: (item) =>
        onChange([
          ...value,
          {
            id: newBlockId(),
            type: "image",
            src: item.url,
            alt: "",
            caption: "",
            width: 100,
            align: "center",
          },
        ]),
    });

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Chưa có nội dung — thêm đoạn văn hoặc ảnh bên dưới.
        </p>
      ) : null}
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          {value.map((block, index) => (
            <SortableBlock
              key={block.id}
              id={block.id}
              label={`${index + 1}. ${block.type === "text" ? "Đoạn văn" : "Ảnh"}`}
              onRemove={() => remove(block.id)}
            >
              {block.type === "text" ? (
                <NewsRichText
                  value={block.doc}
                  onChange={(doc) => update(block.id, { ...block, doc })}
                />
              ) : (
                <ImageBlockFields
                  block={block}
                  onChange={(next) => update(block.id, next)}
                />
              )}
            </SortableBlock>
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => onChange([...value, newTextBlock()])}>
          <Pilcrow className="h-4 w-4" />
          Thêm đoạn văn
        </Button>
        <Button type="button" variant="outline" onClick={addImage}>
          <ImagePlus className="h-4 w-4" />
          Thêm ảnh
        </Button>
      </div>
    </div>
  );
}
