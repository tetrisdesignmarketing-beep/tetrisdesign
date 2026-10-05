import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEDIA_VARIANT_WIDTHS,
  hasMediaVariants,
  mediaVariantPath,
  mediaVariantSrcSet,
  mediaVariantUrl,
  pickMediaVariantWidthAtMost,
} from "@/lib/media-variants";

const STORAGE =
  "https://abc.supabase.co/storage/v1/object/public/media/1716000000-nha-hang";

describe("media variants", () => {
  it("tên bản thu nhỏ cố định theo path gốc", () => {
    assert.equal(
      mediaVariantPath("1716000000-nha-hang.webp", 960),
      "1716000000-nha-hang__w960.webp",
    );
    assert.equal(
      mediaVariantUrl(`${STORAGE}.jpg`, 480),
      `${STORAGE}__w480.webp`,
    );
  });

  it("chỉ ảnh raster trong Supabase Storage mới có bản thu nhỏ", () => {
    assert.equal(hasMediaVariants(`${STORAGE}.webp`), true);
    assert.equal(hasMediaVariants(`${STORAGE}.png`), true);
    assert.equal(hasMediaVariants(`${STORAGE}.gif`), false);
    assert.equal(hasMediaVariants(`${STORAGE}.svg`), false);
    assert.equal(hasMediaVariants("/site/about/about1.png"), false);
    assert.equal(hasMediaVariants(`${STORAGE}__w960.webp`), false);
  });

  it("URL không hỗ trợ → giữ nguyên / không có srcset", () => {
    assert.equal(mediaVariantUrl("/site/a.png", 960), "/site/a.png");
    assert.equal(mediaVariantSrcSet("/site/a.png"), undefined);
  });

  it("srcset đủ các cỡ", () => {
    const srcSet = mediaVariantSrcSet(`${STORAGE}.webp`) ?? "";
    for (const width of MEDIA_VARIANT_WIDTHS) {
      assert.ok(srcSet.includes(`__w${width}.webp ${width}w`));
    }
  });

  it("chọn cỡ xem trước ≤ mục tiêu", () => {
    assert.equal(pickMediaVariantWidthAtMost(640), 480);
    assert.equal(pickMediaVariantWidthAtMost(128), 480);
    assert.equal(pickMediaVariantWidthAtMost(1700), 1600);
  });
});
