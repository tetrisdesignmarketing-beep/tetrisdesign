"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeletePostButtonProps {
  postId: string;
  postTitle: string;
  /** Bảng client-fetch (kéo thả/cuộn vô hạn) — gọi thay cho router.refresh(). */
  onDeleted?: () => void;
}

export function DeletePostButton({
  postId,
  postTitle,
  onDeleted,
}: DeletePostButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bài viết "${postTitle}"?`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch {
      alert("Không thể xóa bài viết. Vui lòng thử lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
