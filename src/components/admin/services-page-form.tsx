"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { CoverImagePicker } from "@/components/admin/cover-image-picker";
import {
  FieldError,
  SitePageFormFooter,
} from "@/components/admin/site-page-form-ui";
import { putSitePage } from "@/lib/put-site-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_SERVICES_LAYOUT,
  servicesPageSchema,
  type ServicesLayout,
  type ServicesPageFormValues,
} from "@/lib/validations/site-page";

/* Cùng kiểu ô chọn "Layout trang chi tiết" ở form bài đăng. */
const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const LAYOUT_OPTIONS: ReadonlyArray<{ value: ServicesLayout; label: string }> = [
  { value: "service", label: "Mặc định — danh sách tiêu đề + ảnh" },
  { value: "service1", label: "Design 1 — xấp ảnh" },
  { value: "service2", label: "Design 2 — cột ảnh co giãn" },
];

const emptyService = {
  title: "",
  label: "",
  description: "",
  image: "",
  imageAlt: "",
};

export function ServicesPageForm({
  initialData,
}: {
  initialData: ServicesPageFormValues;
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
  } = useForm<ServicesPageFormValues>({
    resolver: zodResolver(servicesPageSchema),
    // Dữ liệu cũ chưa có layout → mặc định.
    defaultValues: {
      ...initialData,
      layout: initialData.layout ?? DEFAULT_SERVICES_LAYOUT,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit = async (data: ServicesPageFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await putSitePage("services", data);
      setSuccess("Đã lưu nội dung dịch vụ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="services-layout">Layout trang Dịch vụ</Label>
        <select
          id="services-layout"
          className={selectClassName}
          {...register("layout")}
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldError message={errors.layout?.message} />
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Chưa có dịch vụ trên database. Thêm khối, chọn ảnh từ Media, rồi lưu.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Dịch vụ {index + 1}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                aria-label="Lên"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label="Xuống"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Xóa dịch vụ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CoverImagePicker
            label="Ảnh"
            description="Chọn ảnh từ Media"
            value={watch(`items.${index}.image`)}
            onChange={(url) =>
              setValue(`items.${index}.image`, url, { shouldValidate: true })
            }
          />
          <FieldError message={errors.items?.[index]?.image?.message} />

          <div className="space-y-2">
            <Label htmlFor={`service-title-${index}`}>Tiêu đề</Label>
            <Input
              id={`service-title-${index}`}
              {...register(`items.${index}.title`)}
            />
            <p className="text-xs text-muted-foreground">
              Hiển thị đúng như gõ (vd. &quot;Nhận diện Thương hiệu&quot;), không tự viết hoa.
            </p>
            <FieldError message={errors.items?.[index]?.title?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`service-label-${index}`}>
              Nhãn phụ (không bắt buộc)
            </Label>
            <Input
              id={`service-label-${index}`}
              placeholder="VD: BRAND IDENTITY"
              {...register(`items.${index}.label`)}
            />
            <FieldError message={errors.items?.[index]?.label?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`service-alt-${index}`}>Alt ảnh</Label>
            <Input
              id={`service-alt-${index}`}
              {...register(`items.${index}.imageAlt`)}
            />
            <FieldError message={errors.items?.[index]?.imageAlt?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`service-desc-${index}`}>Mô tả</Label>
            <Textarea
              id={`service-desc-${index}`}
              rows={4}
              {...register(`items.${index}.description`)}
            />
            <FieldError
              message={errors.items?.[index]?.description?.message}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append(emptyService)}
      >
        <Plus className="h-4 w-4" />
        Thêm dịch vụ
      </Button>
      <FieldError message={errors.items?.message} />

      <SitePageFormFooter
        isSubmitting={isSubmitting}
        error={error}
        success={success}
      />
    </form>
  );
}
