"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { CoverImagePicker } from "@/components/admin/cover-image-picker";
import { PostImagesPicker } from "@/components/admin/post-images-picker";
import { FieldError } from "@/components/admin/site-page-form-ui";
import { postSchema, type PostFormValues } from "@/lib/validations/post";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PostFormCategory = { id: string; name: string };

interface PostFormProps {
  initialData?: PostFormValues & { id?: string };
  categories: PostFormCategory[];
  mode: "create" | "edit";
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PostForm({ initialData, categories, mode }: PostFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: initialData ?? {
      title: "",
      slug: "",
      address: "",
      concept: "",
      categoryId: "",
      description: "",
      coverImage: "",
      images: [],
      layoutStyle: "LAYOUTDEFAULT",
      published: false,
      featured: false,
    },
  });

  const title = watch("title");
  const coverImage = watch("coverImage");
  const images = watch("images");
  const layoutStyle = watch("layoutStyle");

  const onSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create" ? "/api/posts" : `/api/posts/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          slug: data.slug || slugify(data.title),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        const details =
          result.details?.fieldErrors &&
          Object.entries(result.details.fieldErrors as Record<string, string[]>)
            .map(([k, v]) => `${k}: ${v?.join(", ")}`)
            .join("; ");
        throw new Error(details || result.error || "Something went wrong");
      }

      router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {categories.length === 0 && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Chưa có category. Tạo category trước khi đăng bài.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input
          id="title"
          placeholder="VD: D.CHIC"
          {...register("title")}
          onBlur={() => {
            const currentSlug = watch("slug");
            if (!currentSlug && title) {
              setValue("slug", slugify(title), { shouldValidate: true });
            }
          }}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input id="slug" placeholder="d-chic" {...register("slug")} />
        <FieldError message={errors.slug?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Địa chỉ</Label>
        <Input
          id="address"
          placeholder="Hà Nội, Sài Gòn,…"
          {...register("address")}
        />
        <FieldError message={errors.address?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">Concept</Label>
        <Input
          id="concept"
          placeholder="Cafe, showroom, bar,…"
          {...register("concept")}
        />
        <FieldError message={errors.concept?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          className={cn(selectClassName)}
          {...register("categoryId")}
        >
          <option value="">Chọn category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId?.message} />
      </div>

      <CoverImagePicker
        label="Ảnh cover"
        description="Chọn ảnh từ Media (drawer)"
        value={coverImage}
        onChange={(url) =>
          setValue("coverImage", url, { shouldValidate: true })
        }
      />
      <FieldError message={errors.coverImage?.message} />

      <PostImagesPicker
        value={images ?? []}
        onChange={(urls) =>
          setValue("images", urls, { shouldValidate: true })
        }
      />
      <FieldError message={errors.images?.message} />

      <div className="space-y-2">
        <Label htmlFor="layoutStyle">Layout trang chi tiết</Label>
        <select
          id="layoutStyle"
          className={cn(selectClassName)}
          value={layoutStyle}
          onChange={(event) =>
            setValue(
              "layoutStyle",
              event.target.value as PostFormValues["layoutStyle"],
              { shouldValidate: true },
            )
          }
        >
          <option value="LAYOUTDEFAULT">Giao diện mặc định</option>
          <option value="LAYOUT1">Giao diện animation gallery</option>
          <option value="LAYOUT2">Giao diện 3D gallery</option>
        </select>
        <FieldError message={errors.layoutStyle?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          placeholder="Mô tả dự án…"
          rows={6}
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          className="h-4 w-4 rounded border-input"
          {...register("published")}
        />
        <Label htmlFor="published" className="font-normal">
          Xuất bản
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured"
          className="h-4 w-4 rounded border-input"
          {...register("featured")}
        />
        <Label htmlFor="featured" className="font-normal">
          Ưu tiên hiển thị đầu trang chủ
        </Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || categories.length === 0}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Tạo bài đăng" : "Cập nhật"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/posts")}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
