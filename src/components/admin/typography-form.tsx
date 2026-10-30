"use client";

import { type CSSProperties, type FormEvent, useState } from "react";
import { RotateCcw } from "lucide-react";
import { SitePageFormFooter } from "@/components/admin/site-page-form-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { putSitePage } from "@/lib/put-site-page";
import {
  TYPOGRAPHY_GROUPS,
  TYPOGRAPHY_GROUP_INFO,
  TYPOGRAPHY_PROPERTY_LABELS,
  TYPOGRAPHY_PROPERTY_OPTIONS,
  defaultTypographySettings,
  typographyDeclarations,
  typographyOptionLabel,
  type TypographyGroup,
  type TypographyProperty,
  type TypographySettings,
  type TypographyStyle,
} from "@/lib/site-typography";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Kiểu gốc gần đúng của từng nhóm trên site — nền cho khung xem trước. */
const PREVIEW_BASE: Record<TypographyGroup, CSSProperties> = {
  display: { fontSize: 28, fontWeight: 500, letterSpacing: "0.05em" },
  heading: { fontSize: 14, fontWeight: 700, textTransform: "uppercase" },
  label: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  body: { fontSize: 14, fontWeight: 500, lineHeight: 1.625, color: "#525252" },
  caption: { fontSize: 12, fontWeight: 500, letterSpacing: "0.03em", color: "#525252" },
};

function toCamelCase(property: string) {
  return property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

/** Cùng bộ quy tắc với CSS sinh ra cho site (buildTypographyCss), áp lên mẫu. */
function previewStyle(group: TypographyGroup, style: TypographyStyle): CSSProperties {
  const overrides = Object.fromEntries(
    typographyDeclarations(style).map(([property, value]) => [
      toCamelCase(property),
      value,
    ]),
  ) as CSSProperties;
  return {
    fontFamily: "var(--font-ui)",
    ...PREVIEW_BASE[group],
    ...overrides,
  };
}

function isDefaultStyle(style: TypographyStyle) {
  return typographyDeclarations(style).length === 0;
}

export function TypographyForm({
  initialData,
}: {
  initialData: TypographySettings;
}) {
  const [settings, setSettings] = useState<TypographySettings>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStyle = (
    group: TypographyGroup,
    property: TypographyProperty,
    value: string,
  ) => {
    setSuccess(null);
    setSettings((current) => ({
      groups: {
        ...current.groups,
        [group]: { ...current.groups[group], [property]: value },
      },
    }));
  };

  const resetGroup = (group: TypographyGroup) => {
    setSuccess(null);
    setSettings((current) => ({
      groups: {
        ...current.groups,
        [group]: defaultTypographySettings().groups[group],
      },
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await putSitePage("typography", settings);
      setSuccess("Đã lưu kiểu chữ — áp dụng cho mọi trang.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          &quot;Mặc định&quot; = giữ đúng thiết kế hiện tại của từng chỗ. Khung
          xem trước cập nhật ngay khi chỉnh; bấm <strong>Lưu thay đổi</strong>{" "}
          để áp dụng đồng bộ cho mọi trang.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSuccess(null);
            setSettings(defaultTypographySettings());
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Khôi phục mặc định
        </Button>
      </div>

      {TYPOGRAPHY_GROUPS.map((group) => {
        const info = TYPOGRAPHY_GROUP_INFO[group];
        const style = settings.groups[group];
        return (
          <section key={group} className="space-y-4 rounded-md border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{info.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {info.description}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDefaultStyle(style)}
                onClick={() => resetGroup(group)}
              >
                <RotateCcw className="h-4 w-4" />
                Mặc định nhóm này
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                Object.keys(TYPOGRAPHY_PROPERTY_OPTIONS) as TypographyProperty[]
              ).map((property) => {
                const id = `typography-${group}-${property}`;
                return (
                  <div key={property} className="space-y-1.5">
                    <Label htmlFor={id} className="text-xs">
                      {TYPOGRAPHY_PROPERTY_LABELS[property]}
                    </Label>
                    <select
                      id={id}
                      className={selectClassName}
                      value={style[property]}
                      onChange={(event) =>
                        updateStyle(group, property, event.target.value)
                      }
                    >
                      {TYPOGRAPHY_PROPERTY_OPTIONS[property].map((value) => (
                        <option key={value} value={value}>
                          {typographyOptionLabel(property, value)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md bg-muted/40 px-4 py-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Xem trước
              </p>
              <p style={previewStyle(group, style)}>{info.sample}</p>
            </div>
          </section>
        );
      })}

      <SitePageFormFooter
        isSubmitting={isSubmitting}
        error={error}
        success={success}
      />
    </form>
  );
}
