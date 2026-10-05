import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidSocialHref,
  normalizeSocialHref,
  resolveSocialLinks,
} from "@/lib/social-links";

describe("normalizeSocialHref", () => {
  it("thêm https:// khi thiếu", () => {
    assert.equal(
      normalizeSocialHref("facebook", "facebook.com/Tetrisvietnam"),
      "https://facebook.com/Tetrisvietnam",
    );
  });

  it("chặn scheme nguy hiểm", () => {
    assert.equal(normalizeSocialHref("facebook", "javascript:alert(1)"), "");
    assert.equal(isValidSocialHref("facebook", "javascript:alert(1)"), false);
  });

  it("trống = hợp lệ (ẩn icon)", () => {
    assert.equal(normalizeSocialHref("tiktok", "  "), "");
    assert.equal(isValidSocialHref("tiktok", ""), true);
  });

  it("Zalo: số điện thoại → zalo.me", () => {
    assert.equal(
      normalizeSocialHref("zalo", "0969.873.396"),
      "https://zalo.me/0969873396",
    );
    assert.equal(
      normalizeSocialHref("zalo", "+84 969 873 396"),
      "https://zalo.me/84969873396",
    );
  });

  it("Zalo: link đầy đủ giữ nguyên, số quá ngắn bị từ chối", () => {
    assert.equal(
      normalizeSocialHref("zalo", "zalo.me/0969873396"),
      "https://zalo.me/0969873396",
    );
    assert.equal(normalizeSocialHref("zalo", "123"), "");
  });
});

describe("resolveSocialLinks", () => {
  it("chưa lưu social → dùng link mặc định trong code", () => {
    const links = resolveSocialLinks({});
    assert.match(links.facebook, /^https:\/\//);
    assert.equal(links.zalo, "");
  });

  it("đã lưu → theo admin, ô trống = ẩn", () => {
    const links = resolveSocialLinks({
      social: { facebook: "", zalo: "0969873396" },
    });
    assert.equal(links.facebook, "");
    assert.equal(links.instagram, "");
    assert.equal(links.zalo, "https://zalo.me/0969873396");
  });
});
