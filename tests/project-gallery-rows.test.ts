import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRows,
  gallerySizes,
  pairShareOf,
  type GalleryItem,
} from "@/lib/project-gallery-rows";

const item = (sourceIndex: number, ratio: number | null): GalleryItem => ({
  src: `/img/${sourceIndex}.webp`,
  sourceIndex,
  ratio,
});
const shape = (rows: ReturnType<typeof buildRows>) =>
  rows.map((row) => row.items.map((it) => it.sourceIndex));

describe("buildRows", () => {
  it("ảnh ngang = 1 hàng, 2 ảnh dọc ghép cặp (kể cả cách ảnh ngang)", () => {
    const rows = buildRows([item(0, 0.66), item(1, 1.5), item(2, 0.7)]);
    assert.deepEqual(shape(rows), [[0, 2], [1]]);
  });

  it("ảnh dọc lẻ ghép với hàng ảnh ngang liền trước", () => {
    const rows = buildRows([item(0, 1.5), item(1, 0.66)]);
    assert.deepEqual(shape(rows), [[0, 1]]);
    assert.equal(rows[0]?.kind, "pair");
  });

  it("ảnh dọc lẻ đầu tiên ghép với hàng ảnh ngang liền sau", () => {
    const rows = buildRows([item(0, 0.66), item(1, 1.5), item(2, 1.4)]);
    assert.deepEqual(shape(rows), [[0, 1], [2]]);
  });

  it("chỉ 1 ảnh dọc → đứng riêng", () => {
    assert.deepEqual(shape(buildRows([item(0, 0.66)])), [[0]]);
  });

  it("chưa biết tỷ lệ → coi như ảnh ngang", () => {
    assert.deepEqual(shape(buildRows([item(0, null), item(1, null)])), [[0], [1]]);
  });
});

describe("pairShareOf", () => {
  it("phần chiều ngang tỷ lệ với tỷ lệ ảnh", () => {
    const a = item(0, 0.5);
    const b = item(1, 1.5);
    assert.equal(pairShareOf([a, b], a), 0.25);
    assert.equal(pairShareOf([a, b], b), 0.75);
  });
});

describe("gallerySizes", () => {
  it("hàng đơn = 100vw, hàng ghép theo phần chiều ngang", () => {
    assert.equal(gallerySizes(), "100vw");
    assert.equal(gallerySizes(0.25), "(min-width: 1024px) 25vw, 100vw");
    assert.equal(gallerySizes(0.333), "(min-width: 1024px) 34vw, 100vw");
  });
});
