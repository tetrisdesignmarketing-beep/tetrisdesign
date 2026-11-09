"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CoverImagePicker } from "@/components/admin/cover-image-picker";
import {
  NewsContentEditor,
  newTextBlock,
} from "@/components/admin/news-content-editor";
import {
  FieldError,
  SitePageFormFooter,
} from "@/components/admin/site-page-form-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugifyVietnamese } from "@/lib/utils";
import {
  NEWS_DESCRIPTION_MAX,
  isHttpUrl,
  type NewsBlock,
} from "@/lib/validations/news";

export interface NewsFormData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  /** ISO */
  publishedAt: string;
  published: boolean;
  featured: boolean;
  /** "" = bài nội bộ (soạn nội dung). */
  externalUrl: string;
  content: NewsBlock[];
}

type NewsKind = "internal" | "external";

type FieldErrors = Partial<Record<string, string[]>>;

/** ISO → yyyy-mm-dd theo giờ Việt Nam (ô ngày). */
function toDateInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(iso));
  return parts; // en-CA → 2026-11-04
}

export function NewsForm({
  mode,
  initialData,
}: {
  mode: "create" | "edit";
  initialData?: NewsFormData;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [date, setDate] = useState(
    toDateInput(initialData?.publishedAt ?? new Date().toISOString()),
  );
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);
  const [content, setContent] = useState<NewsBlock[]>(
    initialData?.content ?? [newTextBlock()],
  );
  const [kind, setKind] = useState<NewsKind>(
    initialData?.externalUrl ? "external" : "internal",
  );
  const [externalUrl, setExternalUrl] = useState(initialData?.externalUrl ?? "");
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoSlug = slugifyVietnamese(title);
  const isExternal = kind === "external";

  /* Đọc og:* của link → điền tiêu đề / mô tả / ảnh bìa (admin sửa lại được). */
  const fetchPreview = async () => {
    const url = externalUrl.trim();
    setPreviewMessage(null);
    if (!isHttpUrl(url)) {
      setErrors((prev) => ({ ...prev, externalUrl: ["Link phải là URL http(s)"] }));
      return;
    }
    setErrors((prev) => ({ ...prev, externalUrl: undefined }));
    setIsFetchingPreview(true);
    try {
      const response = await fetch("/api/news/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          externalUrl: [result?.error ?? "Không đọc được trang này"],
        }));
        return;
      }
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.image) setCoverImage(result.image);
      const missing = [
        !result.title && "tiêu đề",
        !result.description && "mô tả",
        !result.image && "ảnh bìa",
      ].filter(Boolean);
      setPreviewMessage(
        missing.length > 0
          ? `Đã lấy thông tin. Trang không có ${missing.join(", ")} — vui lòng nhập tay.`
          : "Đã lấy thông tin từ link, kiểm tra lại trước khi lưu.",
      );
    } catch {
      setErrors((prev) => ({ ...prev, externalUrl: ["Không đọc được trang này"] }));
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const local: FieldErrors = {};
    if (!title.trim()) local.title = ["Tiêu đề không được để trống"];
    if (!description.trim()) local.description = ["Mô tả không được để trống"];
    if (!coverImage) local.coverImage = ["Chọn ảnh bìa"];
    if (isExternal && !isHttpUrl(externalUrl.trim())) {
      local.externalUrl = ["Nhập link bài viết (http/https)"];
    }
    setErrors(local);
    if (Object.keys(local).length > 0) {
      setError("Vui lòng kiểm tra các ô đánh dấu đỏ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/news" : `/api/news/${initialData?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug: slug.trim(),
            description,
            coverImage,
            /* 0h giờ Việt Nam của ngày đã chọn. */
            publishedAt: `${date}T00:00:00+07:00`,
            published,
            featured,
            externalUrl: isExternal ? externalUrl.trim() : "",
            /* Giữ nội dung đã soạn để đổi lại "Bài viết" không mất. */
            content,
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fieldErrors = (result?.details?.fieldErrors ?? {}) as FieldErrors;
        setErrors(fieldErrors);
        setError(
          fieldErrors.content
            ? "Nội dung bài có khối chưa hợp lệ (ảnh thiếu / chữ quá dài)."
            : result?.error === "Validation failed"
              ? "Vui lòng kiểm tra các ô đánh dấu đỏ."
              : (result?.error ?? "Không lưu được bài tin"),
        );
        return;
      }
      if (mode === "create") {
        router.push(`/admin/news/${result.id}/edit`);
        router.refresh();
        return;
      }
      setSlug(result.slug ?? slug);
      setSuccess("Đã lưu bài tin.");
      router.refresh();
    } catch {
      setError("Không lưu được bài tin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Loại tin</Label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="news-kind"
                  checked={!isExternal}
                  onChange={() => setKind("internal")}
                  className="h-4 w-4 accent-[#6f1114]"
                />
                Bài viết (soạn nội dung)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="news-kind"
                  checked={isExternal}
                  onChange={() => setKind("external")}
                  className="h-4 w-4 accent-[#6f1114]"
                />
                Link bài từ trang khác
              </label>
            </div>
          </div>

          {isExternal ? (
            <div className="space-y-2">
              <Label htmlFor="news-external-url">Link bài viết</Label>
              <div className="flex gap-2">
                <Input
                  id="news-external-url"
                  type="url"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchPreview}
                  disabled={isFetchingPreview || !externalUrl.trim()}
                >
                  {isFetchingPreview ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Lấy thông tin
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bấm &quot;Lấy thông tin&quot; để tự điền tiêu đề, mô tả, ảnh bìa từ trang
                gốc. Người xem bấm vào tin sẽ mở trang này ở tab mới.
              </p>
              {previewMessage ? (
                <p className="text-xs text-emerald-700">{previewMessage}</p>
              ) : null}
              <FieldError message={errors.externalUrl?.[0]} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="news-title">Tiêu đề</Label>
            <Input
              id="news-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="VD: Trải nghiệm văn hoá Thái trong không gian ẩm thực"
            />
            <FieldError message={errors.title?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="news-slug">Đường dẫn (slug)</Label>
            <Input
              id="news-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={autoSlug || "tu-dong-theo-tieu-de"}
            />
            <p className="text-xs text-muted-foreground">
              Để trống → tự tạo từ tiêu đề: /tin-tuc/{slug.trim() || autoSlug || "…"}
            </p>
            <FieldError message={errors.slug?.[0]} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="news-description">Mô tả ngắn (hiện ở trang danh sách)</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/{NEWS_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="news-description"
              rows={4}
              maxLength={NEWS_DESCRIPTION_MAX}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FieldError message={errors.description?.[0]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="news-date">Ngày đăng</Label>
              <Input
                id="news-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <FieldError message={errors.publishedAt?.[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-published">Hiển thị</Label>
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  id="news-published"
                  type="checkbox"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-4 w-4 accent-[#6f1114]"
                />
                Hiện bài trên trang Tin tức
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  id="news-featured"
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="h-4 w-4 accent-[#6f1114]"
                />
                Ưu tiên hiển thị đầu danh sách tin tức
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <CoverImagePicker
            label="Ảnh bìa"
            description={
              isExternal
                ? "Ảnh vuông ở trang danh sách (tự cắt giữa) — lấy từ link hoặc chọn từ Media"
                : "Ảnh vuông ở trang danh sách (tự cắt giữa) và đầu bài viết"
            }
            value={coverImage}
            onChange={setCoverImage}
          />
          <FieldError message={errors.coverImage?.[0]} />
        </div>
      </section>

      <section className={isExternal ? "hidden" : "space-y-3"}>
        <div>
          <h2 className="text-lg font-semibold">Nội dung bài</h2>
          <p className="text-sm text-muted-foreground">
            Thêm đoạn văn / ảnh, kéo ⋮⋮ để sắp xếp. Ảnh chỉnh độ rộng và căn lề ngay
            trong khối.
          </p>
        </div>
        <NewsContentEditor value={content} onChange={setContent} />
        <FieldError message={errors.content?.[0]} />
      </section>

      <SitePageFormFooter isSubmitting={isSubmitting} error={error} success={success} />
    </form>
  );
}
