import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { postReorderSchema } from "@/lib/validations/post";

/**
 * Lưu thứ tự kéo thả — nhận id các bài đang hiển thị ở client (theo thứ tự
 * mới sau khi kéo), ghép lại vào thứ tự tổng và renormalize `sortOrder`
 * thành dãy 0..N-1 cho TOÀN BỘ bài đăng (không chỉ phần vừa kéo).
 *
 * Dùng `$executeRaw` thay vì `prisma.post.update()`: update() đi qua
 * field-mapping layer của Prisma Client nên sẽ tự bump `updatedAt`
 * (`@updatedAt`) dù chỉ đổi `sortOrder` — `src/app/sitemap.ts` dùng
 * `post.updatedAt` làm `lastModified` cho SEO, nên mỗi lần kéo thả sẽ làm
 * sai lastModified của mọi bài bị renormalize. Raw SQL bỏ qua layer đó.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { orderedIds } = parsed.data;

  try {
    const rows = await prisma.post.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const allIds = rows.map((row) => row.id);
    const oldSortOrderById = new Map(rows.map((row) => [row.id, row.sortOrder]));

    const targetSet = new Set(orderedIds);
    const hasDuplicates = targetSet.size !== orderedIds.length;
    const allExist = orderedIds.every((id) => oldSortOrderById.has(id));
    if (hasDuplicates || !allExist) {
      return NextResponse.json(
        {
          error: "Dữ liệu đã thay đổi, vui lòng tải lại trang trước khi sắp xếp lại.",
        },
        { status: 409 },
      );
    }

    // Đi qua thứ tự hiện có; mỗi vị trí thuộc tập orderedIds thì thay bằng
    // phần tử tiếp theo trong orderedIds (thứ tự mới) — id không nằm trong
    // tập kéo thả giữ nguyên vị trí tương đối. Không cần orderedIds liên tục.
    let cursor = 0;
    const mergedIds = allIds.map((id) =>
      targetSet.has(id) ? orderedIds[cursor++] : id,
    );

    const updates = mergedIds
      .map((id, index) => ({ id, sortOrder: index }))
      .filter(({ id, sortOrder }) => oldSortOrderById.get(id) !== sortOrder);

    if (updates.length > 0) {
      await prisma.$executeRaw`
        UPDATE "Post" AS p SET "sortOrder" = c.sort_order
        FROM (VALUES ${Prisma.join(
          updates.map((u) => Prisma.sql`(${u.id}::text, ${u.sortOrder}::int)`),
        )}) AS c(id, sort_order)
        WHERE p.id = c.id
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reorder posts error:", err);
    return NextResponse.json(
      { error: "Không thể lưu thứ tự mới" },
      { status: 500 },
    );
  }
}
