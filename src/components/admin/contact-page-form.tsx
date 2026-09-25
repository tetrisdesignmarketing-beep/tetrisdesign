"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FieldError,
  SitePageFormFooter,
} from "@/components/admin/site-page-form-ui";
import { composeContactAddress } from "@/lib/contact-address";
import {
  normalizeSocialHref,
  resolveSocialLinks,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  type SocialKey,
} from "@/lib/social-links";
import { putSitePage } from "@/lib/put-site-page";
import { VN_PROVINCES } from "@/lib/vn-provinces";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  contactPageFormSchema,
  type ContactPageContent,
  type ContactPageFormValues,
} from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

const SOCIAL_PLACEHOLDERS: Record<SocialKey, string> = {
  facebook: "facebook.com/Tetrisvietnam",
  instagram: "instagram.com/tetris.interior",
  tiktok: "tiktok.com/@tetrisdesignn",
  behance: "behance.net/tentaikhoan",
  zalo: "0969 873 396 hoặc https://zalo.me/…",
};

export function ContactPageForm({
  initialData,
}: {
  initialData: ContactPageContent;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContactPageFormValues>({
    resolver: zodResolver(contactPageFormSchema),
    defaultValues: {
      email: initialData.email,
      phone: initialData.phone,
      addressLine: initialData.addressLine,
      province: initialData.province,
      /* Chưa lưu lần nào → điền sẵn link mặc định đang hiện trên footer. */
      social: resolveSocialLinks(initialData),
    },
  });

  const addressLine = useWatch({ control, name: "addressLine" }) ?? "";
  const province = useWatch({ control, name: "province" }) ?? "";
  const previewAddress = useMemo(
    () => composeContactAddress(addressLine, province),
    [addressLine, province],
  );

  const onSubmit = async (data: ContactPageFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: ContactPageContent = {
        ...data,
        address: composeContactAddress(data.addressLine, data.province),
      };
      await putSitePage("contact", payload);
      setSuccess("Đã lưu thông tin liên hệ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" type="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-phone">Số điện thoại</Label>
        <Input id="contact-phone" {...register("phone")} />
        <FieldError message={errors.phone?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-address-line">
          Địa chỉ chi tiết (số nhà, đường, ngõ, phường/xã…)
        </Label>
        <Textarea
          id="contact-address-line"
          rows={3}
          placeholder="Số 31 Ngõ 135 Đội Cấn, Ba Đình"
          {...register("addressLine")}
        />
        <FieldError message={errors.addressLine?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-province">Tỉnh / Thành phố</Label>
        <select
          id="contact-province"
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...register("province")}
        >
          <option value="">— Chọn tỉnh / thành phố —</option>
          {VN_PROVINCES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <FieldError message={errors.province?.message} />
        <p className="text-muted-foreground text-xs">
          Chỉ Việt Nam — 34 tỉnh/TP (sau sắp xếp 2025). Không dùng autocomplete
          trả phí.
        </p>
      </div>

      <fieldset className="space-y-4 rounded-md border px-4 py-4">
        <legend className="px-1 text-sm font-medium">Mạng xã hội (footer)</legend>
        <p className="text-muted-foreground text-xs">
          Để trống ô nào thì icon đó ẩn khỏi footer. Thiếu{" "}
          <code>https://</code> sẽ tự thêm.
        </p>
        {SOCIAL_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`contact-social-${key}`}>
              {SOCIAL_LABELS[key]}
            </Label>
            <Input
              id={`contact-social-${key}`}
              inputMode={key === "zalo" ? "text" : "url"}
              autoComplete="off"
              placeholder={SOCIAL_PLACEHOLDERS[key]}
              {...register(`social.${key}`, {
                onBlur: (event) => {
                  const normalized = normalizeSocialHref(
                    key,
                    event.target.value,
                  );
                  /* Chỉ thay khi hợp lệ — sai thì giữ nguyên để báo lỗi. */
                  if (normalized || !event.target.value.trim()) {
                    setValue(`social.${key}`, normalized, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                },
              })}
            />
            {key === "zalo" ? (
              <p className="text-muted-foreground text-xs">
                Nhập số điện thoại (vd. 0969 873 396) → tự tạo link
                https://zalo.me/…, hoặc dán link Zalo đầy đủ.
              </p>
            ) : null}
            <FieldError message={errors.social?.[key]?.message} />
          </div>
        ))}
      </fieldset>

      {previewAddress ? (
        <div className="bg-muted/40 space-y-1 rounded-md border px-3 py-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Địa chỉ hiển thị trên site / map
          </p>
          <p className="text-sm">{previewAddress}</p>
        </div>
      ) : null}

      <SitePageFormFooter
        isSubmitting={isSubmitting}
        error={error}
        success={success}
      />
    </form>
  );
}
