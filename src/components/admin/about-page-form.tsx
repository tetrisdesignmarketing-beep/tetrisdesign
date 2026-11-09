"use client";

import { type ReactNode, useRef, useState } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  GripVertical,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { CoverImagePicker } from "@/components/admin/cover-image-picker";
import { useMediaDrawer } from "@/components/admin/media-drawer-context";
import {
  FieldError,
  SitePageFormFooter,
} from "@/components/admin/site-page-form-ui";
import { normalizePartnerHref } from "@/lib/partner-href";
import { cn } from "@/lib/utils";
import { putSitePage } from "@/lib/put-site-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  aboutPageFormSchema,
  type AboutAwardsBlock,
  type AboutContentBlock,
  type AboutPageBlock,
  type AboutPageContent,
  type AboutTextBlock,
} from "@/lib/validations/site-page";

const BLOCK_TYPE_LABELS: Record<AboutContentBlock["type"], string> = {
  text: "Văn bản",
  awards: "Giải thưởng",
};

/** Lỗi của 1 khối (union text/awards) — gộp field để đọc không cần thu hẹp kiểu. */
type BlockErrors = FieldErrors<{
  title: string;
  paragraphs: string[];
  groups: AboutAwardsBlock["groups"];
}>;

/** Lỗi của mảng đoạn văn: lỗi cả mảng (min 1) hoặc đoạn đầu tiên bị trống. */
function paragraphsErrorMessage(errors: BlockErrors["paragraphs"]) {
  if (!errors) return undefined;
  if (errors.message) return errors.message;
  if (Array.isArray(errors)) {
    return errors.find((item) => item?.message)?.message as string | undefined;
  }
  return undefined;
}

function newTextBlock(): AboutTextBlock {
  return { type: "text", title: "", paragraphs: [""] };
}

/** Dòng giải mới: năm hiện tại + 1 ô Tên giải (đậm) trống. */
function newAwardItem() {
  return {
    year: new Date().getFullYear(),
    parts: [{ text: "", bold: true }],
  };
}

function newAwardsBlock(): AboutAwardsBlock {
  return {
    type: "awards",
    title: "",
    groups: [
      {
        title: "",
        items: [newAwardItem()],
      },
    ],
  };
}

/**
 * Vạch Brand break phải còn ≥ 1 khối nội dung trước và sau (schema) — tính
 * vị trí vạch sau thao tác để khoá nút ↑ ↓ / xoá thay vì báo lỗi khi lưu.
 */
function breakIndexOf(blocks: readonly AboutPageBlock[]) {
  return blocks.findIndex((block) => block.type === "brandBreak");
}

function isBreakIndexValid(breakIndex: number, length: number) {
  return breakIndex > 0 && breakIndex < length - 1;
}

function canMoveBlock(
  blocks: readonly AboutPageBlock[],
  from: number,
  to: number,
) {
  if (to < 0 || to >= blocks.length) return false;
  const breakIndex = breakIndexOf(blocks);
  const nextBreak =
    from === breakIndex ? to : to === breakIndex ? from : breakIndex;
  return isBreakIndexValid(nextBreak, blocks.length);
}

function canRemoveBlock(blocks: readonly AboutPageBlock[], index: number) {
  const breakIndex = breakIndexOf(blocks);
  if (index === breakIndex) return false;
  const nextBreak = index < breakIndex ? breakIndex - 1 : breakIndex;
  return isBreakIndexValid(nextBreak, blocks.length - 1);
}

function StringList({
  label,
  values,
  onChange,
  error,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  /* Bọc / gỡ `**…**` quanh vùng đang chọn — site hiển thị thành chữ đậm
     (lib/inline-bold.tsx). Không chọn gì → chèn `****`, con trỏ ở giữa. */
  const toggleBold = (index: number) => {
    const el = textareaRefs.current[index];
    if (!el) return;
    const text = values[index] ?? "";
    const { selectionStart: start, selectionEnd: end } = el;
    const wrapped =
      start >= 2 &&
      text.slice(start - 2, start) === "**" &&
      text.slice(end, end + 2) === "**";
    const nextText = wrapped
      ? text.slice(0, start - 2) + text.slice(start, end) + text.slice(end + 2)
      : `${text.slice(0, start)}**${text.slice(start, end)}**${text.slice(end)}`;
    const offset = wrapped ? -2 : 2;
    const next = [...values];
    next[index] = nextText;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + offset, end + offset);
    });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Chữ đậm: bôi chọn chữ rồi bấm nút <strong>B</strong> (hoặc gõ{" "}
        <code>**chữ đậm**</code>).
      </p>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Textarea
            ref={(el) => {
              textareaRefs.current[index] = el;
            }}
            rows={3}
            value={value}
            onChange={(e) => {
              const next = [...values];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => toggleBold(index)}
            aria-label="In đậm phần đã chọn"
            title="In đậm (**chữ**)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={values.length <= 1}
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            aria-label="Xóa đoạn"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="h-4 w-4" />
        Thêm đoạn
      </Button>
      <FieldError message={error} />
    </div>
  );
}

type AwardItemPath =
  `blocks.${number}.groups.${number}.items.${number}`;
type AwardItemErrors = NonNullable<
  NonNullable<NonNullable<BlockErrors["groups"]>[number]>["items"]
>[number];

/** 1 đoạn của dòng giải — kéo-thả để đổi thứ tự (cùng kiểu bảng đối tác). */
function SortableAwardPart({
  id,
  children,
}: {
  id: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label="Kéo để đổi vị trí đoạn"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-w-[14rem] flex-1 basis-[16rem] items-start gap-1",
        isDragging && "relative z-10 opacity-80",
      )}
    >
      {children(handle)}
    </div>
  );
}

/**
 * Dòng giải: Năm (cố định đầu) + các đoạn Tên giải (đậm) / Ghi chú (thường)
 * thêm–xoá–kéo-thả; trên trang các đoạn nối bằng dấu cách theo thứ tự này.
 */
function AwardItemRow({
  itemPath,
  control,
  register,
  errors,
  canRemove,
  onRemove,
}: {
  itemPath: AwardItemPath;
  control: Control<AboutPageContent>;
  register: UseFormRegister<AboutPageContent>;
  errors?: AwardItemErrors;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: `${itemPath}.parts`,
  });
  const parts = useWatch({ control, name: `${itemPath}.parts` }) ?? [];
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };
  const partsErrors = errors?.parts;
  const partsMessage =
    partsErrors?.root?.message ??
    (partsErrors as { message?: string } | undefined)?.message;
  const boldCount = parts.filter((part) => part?.bold).length;

  return (
    <div className="grid gap-2 rounded-md border border-dashed p-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
      <div>
        <Input
          type="number"
          aria-label="Năm"
          className="font-semibold"
          {...register(`${itemPath}.year`, { valueAsNumber: true })}
        />
        <FieldError message={errors?.year?.message} />
      </div>

      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-2">
              {fields.map((field, partIndex) => {
                const bold = parts[partIndex]?.bold ?? field.bold;
                /* Phải còn ≥ 1 đoạn đậm (schema) → khoá xoá / tắt đậm đoạn đậm cuối. */
                const lastBold = bold && boldCount <= 1;
                return (
                  <SortableAwardPart key={field.id} id={field.id}>
                    {(handle) => (
                      <>
                        {handle}
                        <div className="min-w-0 flex-1">
                          <Input
                            aria-label={bold ? "Tên giải (in đậm)" : "Dự án / ghi chú"}
                            placeholder={bold ? "Tên giải" : "Dự án / ghi chú"}
                            className={cn(bold && "font-semibold")}
                            {...register(`${itemPath}.parts.${partIndex}.text`)}
                          />
                          <FieldError
                            message={partsErrors?.[partIndex]?.text?.message}
                          />
                        </div>
                        <Button
                          type="button"
                          variant={bold ? "default" : "outline"}
                          size="icon"
                          className="shrink-0"
                          disabled={lastBold}
                          aria-pressed={bold}
                          aria-label={bold ? "Bỏ in đậm" : "In đậm"}
                          title={bold ? "Đang in đậm (Tên giải)" : "Chữ thường (ghi chú)"}
                          onClick={() =>
                            update(partIndex, {
                              text: parts[partIndex]?.text ?? field.text,
                              bold: !bold,
                            })
                          }
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          disabled={fields.length <= 1 || lastBold}
                          onClick={() => remove(partIndex)}
                          aria-label="Xoá đoạn"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </SortableAwardPart>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ text: "", bold: true })}
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold">Tên giải</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ text: "", bold: false })}
          >
            <Plus className="h-4 w-4" />
            Dự án / ghi chú
          </Button>
        </div>
        <FieldError message={partsMessage} />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label="Xóa giải thưởng"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AwardGroupFields({
  blockIndex,
  groupIndex,
  control,
  register,
  errors,
  canRemove,
  onRemove,
}: {
  blockIndex: number;
  groupIndex: number;
  control: Control<AboutPageContent>;
  register: UseFormRegister<AboutPageContent>;
  errors?: BlockErrors;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const base = `blocks.${blockIndex}.groups.${groupIndex}` as const;
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${base}.items`,
  });

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Nhóm {groupIndex + 1}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Xóa nhóm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Tên nhóm</Label>
        <Input {...register(`${base}.title`)} />
        <FieldError message={errors?.groups?.[groupIndex]?.title?.message} />
      </div>
      {fields.map((item, itemIndex) => (
        <AwardItemRow
          key={item.id}
          itemPath={`${base}.items.${itemIndex}`}
          control={control}
          register={register}
          errors={errors?.groups?.[groupIndex]?.items?.[itemIndex]}
          canRemove={fields.length > 1}
          onRemove={() => remove(itemIndex)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append(newAwardItem())
        }
      >
        <Plus className="h-4 w-4" />
        Thêm giải
      </Button>
    </div>
  );
}

function AwardsBlockGroups({
  blockIndex,
  control,
  register,
  errors,
}: {
  blockIndex: number;
  control: Control<AboutPageContent>;
  register: UseFormRegister<AboutPageContent>;
  errors?: BlockErrors;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `blocks.${blockIndex}.groups`,
  });

  return (
    <div className="space-y-3">
      {fields.map((group, index) => (
        <AwardGroupFields
          key={group.id}
          blockIndex={blockIndex}
          groupIndex={index}
          control={control}
          register={register}
          errors={errors}
          canRemove={fields.length > 1}
          onRemove={() => remove(index)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            title: "",
            items: [newAwardItem()],
          })
        }
      >
        <Plus className="h-4 w-4" />
        Thêm nhóm giải thưởng
      </Button>
      <FieldError message={errors?.groups?.message} />
    </div>
  );
}

/** Logo dạng ô nhỏ trong bảng — bấm để chọn/đổi ảnh từ Media. */
function PartnerLogoCell({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (url: string) => void;
}) {
  const { openMedia } = useMediaDrawer();
  return (
    <button
      type="button"
      onClick={() =>
        openMedia({ accept: "image", onPick: (item) => onChange(item.url) })
      }
      className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted/30 hover:border-foreground/40"
      aria-label={value ? `Đổi logo ${name}` : "Chọn logo"}
      title={value ? "Đổi logo" : "Chọn logo từ Media"}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={name} className="h-full w-full object-contain p-1" />
      ) : (
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}

/** Dòng bảng kéo-thả — cùng pattern với admin-posts-table (tay nắm ở cột đầu). */
function SortableTableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="flex h-10 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label="Kéo để đổi vị trí"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        isDragging && "relative z-10 bg-background opacity-80 shadow-lg",
      )}
    >
      {children(handle)}
    </TableRow>
  );
}

function PartnerFields({
  control,
  register,
  watch,
  setValue,
  errors,
}: {
  control: Control<AboutPageContent>;
  register: UseFormRegister<AboutPageContent>;
  watch: UseFormWatch<AboutPageContent>;
  setValue: UseFormSetValue<AboutPageContent>;
  errors: FieldErrors<AboutPageContent>;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "partners.items",
  });
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Thứ tự trong bảng = thứ tự logo chạy trên trang — kéo biểu tượng ⋮⋮ để
        sắp xếp. Bấm ô logo để chọn/đổi
        ảnh. Link (tuỳ chọn): bấm logo trên trang mở link ở tab mới; để trống
        thì logo không bấm được.
      </p>
      <div className="rounded-md border">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 px-2" aria-label="Kéo sắp xếp" />
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-24">Logo</TableHead>
              <TableHead>Tên đối tác</TableHead>
              <TableHead>Link (tuỳ chọn)</TableHead>
              <TableHead className="w-16 text-right">Xoá</TableHead>
            </TableRow>
          </TableHeader>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <TableBody>
                {fields.map((field, index) => {
                  const rowErrors = errors.partners?.items?.[index];
                  return (
                    <SortableTableRow key={field.id} id={field.id}>
                      {(handle) => (
                        <>
                          <TableCell className="px-2 py-2 align-top">
                            {handle}
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top text-muted-foreground">
                            <span className="inline-flex h-10 items-center">
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <PartnerLogoCell
                              value={watch(`partners.items.${index}.logo`)}
                              name={watch(`partners.items.${index}.name`)}
                              onChange={(url) =>
                                setValue(`partners.items.${index}.logo`, url, {
                                  shouldValidate: true,
                                })
                              }
                            />
                            <FieldError message={rowErrors?.logo?.message} />
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <Input
                              aria-label="Tên đối tác"
                              {...register(`partners.items.${index}.name`)}
                            />
                            <FieldError message={rowErrors?.name?.message} />
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <Input
                              type="text"
                              inputMode="url"
                              aria-label="Link"
                              placeholder="https://… hoặc amway.com"
                              {...register(`partners.items.${index}.href`, {
                                /* Gõ thiếu https:// → tự thêm khi rời ô */
                                onBlur: (event) => {
                                  const normalized = normalizePartnerHref(
                                    event.target.value,
                                  );
                                  if (normalized) {
                                    setValue(`partners.items.${index}.href`, normalized, {
                                      shouldValidate: true,
                                    });
                                  }
                                },
                              })}
                            />
                            <FieldError message={rowErrors?.href?.message} />
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={fields.length <= 1}
                                onClick={() => remove(index)}
                                aria-label="Xóa đối tác"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </SortableTableRow>
                  );
                })}
              </TableBody>
            </SortableContext>
          </DndContext>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ name: "", logo: "", href: "" })}
      >
        <Plus className="h-4 w-4" />
        Thêm đối tác
      </Button>
      <FieldError
        message={errors.partners?.items?.root?.message ?? errors.partners?.items?.message}
      />
    </div>
  );
}

export function AboutPageForm({
  initialData,
}: {
  initialData: AboutPageContent;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AboutPageContent>({
    resolver: zodResolver(aboutPageFormSchema),
    defaultValues: initialData,
  });

  const {
    fields: blockFields,
    append: appendBlock,
    insert: insertBlock,
    remove: removeBlock,
    move: moveBlock,
  } = useFieldArray({
    control,
    name: "blocks",
  });
  const blocks = watch("blocks");
  /* Khối mới vào cuối phần trên (ngay trước Brand break). */
  const addBlock = (block: AboutContentBlock) => {
    const breakIndex = breakIndexOf(blocks);
    if (breakIndex < 0) appendBlock(block);
    else insertBlock(breakIndex, block);
  };

  const onSubmit = async (data: AboutPageContent) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await putSitePage("about", data);
      setSuccess("Đã lưu nội dung giới thiệu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <CoverImagePicker
        label="Ảnh hero"
        description="Ảnh full viewport đầu trang About"
        value={watch("heroImage")}
        onChange={(url) => setValue("heroImage", url, { shouldValidate: true })}
      />
      <FieldError message={errors.heroImage?.message} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Khối nội dung</h2>
          <p className="text-sm text-muted-foreground">
            Trang Giới thiệu hiển thị đúng thứ tự từ trên xuống dưới như danh
            sách này (sau Ảnh hero, trước Đối tác). Dùng ↑ ↓ để sắp xếp; cần ít
            nhất một khối trước và sau Brand break.
          </p>
        </div>
        {blockFields.map((field, index) => {
          const block = blocks[index] ?? field;
          const blockErrors = errors.blocks?.[index] as BlockErrors | undefined;
          const isBreak = field.type === "brandBreak";
          const moveButtons = (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canMoveBlock(blocks, index, index - 1)}
                onClick={() => moveBlock(index, index - 1)}
                aria-label="Chuyển lên"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canMoveBlock(blocks, index, index + 1)}
                onClick={() => moveBlock(index, index + 1)}
                aria-label="Chuyển xuống"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </>
          );

          if (isBreak) {
            return (
              <div
                key={field.id}
                className="space-y-4 rounded-md border-2 border-dashed bg-muted/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-auto text-sm font-semibold">
                    {index + 1}. Brand break (TETRIS DESIGN)
                  </p>
                  {moveButtons}
                </div>
                <p className="text-xs text-muted-foreground">
                  Khối phía trên: hiện trong ảnh hero, mờ dần theo cuộn. Khối
                  phía dưới: tiêu đề chữ nảy, nội dung hiện dần, trước Đối tác.
                </p>
                <CoverImagePicker
                  label="Ảnh brand break"
                  description="Ảnh màn TETRIS DESIGN"
                  value={watch("brandBreakImage")}
                  onChange={(url) =>
                    setValue("brandBreakImage", url, { shouldValidate: true })
                  }
                />
                <FieldError message={errors.brandBreakImage?.message} />
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-4 rounded-md border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm font-semibold">
                  {index + 1}. {BLOCK_TYPE_LABELS[field.type]}
                </p>
                {moveButtons}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canRemoveBlock(blocks, index)}
                  onClick={() => removeBlock(index)}
                  aria-label="Xóa khối"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`about-block-${index}-title`}>Tiêu đề</Label>
                <Input
                  id={`about-block-${index}-title`}
                  {...register(`blocks.${index}.title`)}
                />
                <FieldError message={blockErrors?.title?.message} />
              </div>
              {field.type === "text" ? (
                <StringList
                  label="Đoạn văn"
                  values={(block as AboutTextBlock).paragraphs ?? [""]}
                  onChange={(next) =>
                    setValue(`blocks.${index}.paragraphs`, next, {
                      shouldValidate: true,
                    })
                  }
                  error={paragraphsErrorMessage(blockErrors?.paragraphs)}
                />
              ) : (
                <AwardsBlockGroups
                  blockIndex={index}
                  control={control}
                  register={register}
                  errors={blockErrors}
                />
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => addBlock(newTextBlock())}
          >
            <Plus className="h-4 w-4" />
            Thêm khối văn bản
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => addBlock(newAwardsBlock())}
          >
            <Plus className="h-4 w-4" />
            Thêm khối giải thưởng
          </Button>
        </div>
        <FieldError
          message={errors.blocks?.root?.message ?? errors.blocks?.message}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Đối tác</h2>
        <div className="space-y-2">
          <Label>Tiêu đề</Label>
          <Input {...register("partners.title")} />
          <FieldError message={errors.partners?.title?.message} />
        </div>
        <PartnerFields
          control={control}
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      </section>

      <SitePageFormFooter
        isSubmitting={isSubmitting}
        error={error}
        success={success}
      />
    </form>
  );
}
