import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LinkPreviewError, fetchLinkPreview } from "@/lib/news-link-preview";
import { newsLinkPreviewSchema } from "@/lib/validations/news";

/** Admin dán link tin ngoài → trả tiêu đề / mô tả / ảnh để điền sẵn form. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = newsLinkPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Link không hợp lệ" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await fetchLinkPreview(parsed.data.url));
  } catch (err) {
    const message = err instanceof LinkPreviewError ? err.message : "Không đọc được trang này";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
