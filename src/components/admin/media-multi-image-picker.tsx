"use client";

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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, X } from "lucide-react";
import { useMediaDrawer } from "@/components/admin/media-drawer-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MediaMultiImagePickerProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  description?: string;
  emptyText?: string;
  buttonText?: string;
}

interface SortableImageProps {
  src: string;
  index: number;
  onRemove: () => void;
}

function SortableImage({ src, index, onRemove }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: src });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-background",
        isDragging && "z-10 opacity-60 shadow-lg",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="h-32 w-full select-none object-cover"
      />

      <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-xs font-medium text-white">
        {index + 1}
      </div>

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute bottom-2 left-2 flex h-7 w-7 touch-none items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Kéo để đổi vị trí"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={onRemove}
        aria-label="Gỡ ảnh"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function MediaMultiImagePicker({
  value,
  onChange,
  label = "Ảnh",
  description = "Chọn nhiều ảnh từ Media",
  emptyText = "Chưa chọn ảnh",
  buttonText = "Chọn ảnh từ Media",
}: MediaMultiImagePickerProps) {
  const { openMedia } = useMediaDrawer();
  const images = value ?? [];

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.indexOf(String(active.id));
    const newIndex = images.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(images, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>

      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((src, index) => (
                <SortableImage
                  key={src}
                  src={src}
                  index={index}
                  onRemove={() =>
                    onChange(images.filter((item) => item !== src))
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <div className="text-center text-sm text-muted-foreground">
            <ImageIcon className="mx-auto mb-2 h-6 w-6" />
            {emptyText}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          openMedia({
            accept: "image",
            selectedUrls: images,
            onConfirm: (urls) => onChange(urls),
          })
        }
      >
        {buttonText}
        {images.length > 0 ? ` (${images.length})` : ""}
      </Button>
    </div>
  );
}
