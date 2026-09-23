"use client";

import { useState } from "react";
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { CoverImagePicker } from "@/components/admin/cover-image-picker";
import {
  FieldError,
  SitePageFormFooter,
} from "@/components/admin/site-page-form-ui";
import { normalizePartnerHref } from "@/lib/partner-href";
import { putSitePage } from "@/lib/put-site-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  aboutPageFormSchema,
  type AboutPageContent,
} from "@/lib/validations/site-page";

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
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Textarea
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

function AwardGroupFields({
  groupIndex,
  control,
  register,
  errors,
  canRemove,
  onRemove,
}: {
  groupIndex: number;
  control: Control<AboutPageContent>;
  register: UseFormRegister<AboutPageContent>;
  errors: FieldErrors<AboutPageContent>;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `awards.groups.${groupIndex}.items`,
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
        <Input {...register(`awards.groups.${groupIndex}.title`)} />
        <FieldError
          message={errors.awards?.groups?.[groupIndex]?.title?.message}
        />
      </div>
      {fields.map((item, itemIndex) => (
        <div key={item.id} className="grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
          <Input
            type="number"
            {...register(
              `awards.groups.${groupIndex}.items.${itemIndex}.year`,
              { valueAsNumber: true },
            )}
          />
          <Input
            {...register(
              `awards.groups.${groupIndex}.items.${itemIndex}.title`,
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={fields.length <= 1}
            onClick={() => remove(itemIndex)}
            aria-label="Xóa giải thưởng"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ year: new Date().getFullYear(), title: "" })}
      >
        <Plus className="h-4 w-4" />
        Thêm giải
      </Button>
    </div>
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: "partners.items",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-md border p-3">
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
          <div className="space-y-2">
            <Label>Tên đối tác</Label>
            <Input {...register(`partners.items.${index}.name`)} />
            <FieldError
              message={errors.partners?.items?.[index]?.name?.message}
            />
          </div>
          <div className="space-y-2">
            <Label>Link (tuỳ chọn)</Label>
            <Input
              type="text"
              inputMode="url"
              placeholder="https://… hoặc amway.com"
              {...register(`partners.items.${index}.href`, {
                /* Gõ thiếu https:// → tự thêm khi rời ô */
                onBlur: (event) => {
                  const normalized = normalizePartnerHref(event.target.value);
                  if (normalized) {
                    setValue(`partners.items.${index}.href`, normalized, {
                      shouldValidate: true,
                    });
                  }
                },
              })}
            />
            <p className="text-xs text-muted-foreground">
              Bấm logo trên trang sẽ mở link ở tab mới. Để trống: logo không bấm
              được.
            </p>
            <FieldError
              message={errors.partners?.items?.[index]?.href?.message}
            />
          </div>
          <CoverImagePicker
            label="Logo"
            description="Chọn logo từ Media"
            value={watch(`partners.items.${index}.logo`)}
            onChange={(url) =>
              setValue(`partners.items.${index}.logo`, url, {
                shouldValidate: true,
              })
            }
          />
          <FieldError
            message={errors.partners?.items?.[index]?.logo?.message}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ name: "", logo: "", href: "" })}
      >
        <Plus className="h-4 w-4" />
        Thêm đối tác
      </Button>
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
    fields: groups,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control,
    name: "awards.groups",
  });

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

      <CoverImagePicker
        label="Ảnh brand break"
        description="Ảnh màn TETRIS DESIGN"
        value={watch("brandBreakImage")}
        onChange={(url) =>
          setValue("brandBreakImage", url, { shouldValidate: true })
        }
      />
      <FieldError message={errors.brandBreakImage?.message} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Giới thiệu</h2>
        <div className="space-y-2">
          <Label>Tiêu đề</Label>
          <Input {...register("introduction.title")} />
          <FieldError message={errors.introduction?.title?.message} />
        </div>
        <StringList
          label="Đoạn văn"
          values={watch("introduction.paragraphs")}
          onChange={(next) =>
            setValue("introduction.paragraphs", next, { shouldValidate: true })
          }
          error={errors.introduction?.paragraphs?.message}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Giải thưởng</h2>
        <div className="space-y-2">
          <Label>Tiêu đề mục</Label>
          <Input {...register("awards.title")} />
          <FieldError message={errors.awards?.title?.message} />
        </div>
        {groups.map((group, index) => (
          <AwardGroupFields
            key={group.id}
            groupIndex={index}
            control={control}
            register={register}
            errors={errors}
            canRemove={groups.length > 1}
            onRemove={() => removeGroup(index)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendGroup({
              title: "",
              items: [{ year: new Date().getFullYear(), title: "" }],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Thêm nhóm giải thưởng
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Hành trình</h2>
        <div className="space-y-2">
          <Label>Tiêu đề</Label>
          <Input {...register("journey.title")} />
          <FieldError message={errors.journey?.title?.message} />
        </div>
        <StringList
          label="Đoạn văn"
          values={watch("journey.paragraphs")}
          onChange={(next) =>
            setValue("journey.paragraphs", next, { shouldValidate: true })
          }
          error={errors.journey?.paragraphs?.message}
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
