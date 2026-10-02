import { describe, it, expect } from "vitest";
import {
  defaultGift,
  validateGift,
  youtubeId,
  validateFile,
  detectMime,
} from "../shared/model";
describe("content validation", () => {
  it("keeps empty personal fields and correct two dates", () => {
    expect(validateGift(defaultGift)).toEqual([]);
    expect(defaultGift.recipient).toBe("");
    expect(defaultGift.birthDate).toBe("2007-10-03");
    expect(defaultGift.celebrationDate).toBe("2026-10-03");
  });
  it("rejects invalid dates, age, crop, duplicate ids and fake links", () => {
    const g = structuredClone(defaultGift);
    g.birthDate = "2026-02-30";
    g.age = 0;
    g.songs[0].url = "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE";
    g.photos[1].id = g.photos[0].id;
    expect(validateGift(g).length).toBeGreaterThan(2);
  });
  it("accepts only official youtube hosts with valid ids", () => {
    for (const u of [
      "https://youtu.be/M7lc1UVf-VE",
      "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      "https://youtube.com/shorts/M7lc1UVf-VE",
    ])
      expect(youtubeId(u)).toBe("M7lc1UVf-VE");
    for (const u of [
      "javascript:alert(1)",
      "http://youtu.be/M7lc1UVf-VE",
      "https://youtu.be/short",
      "https://youtube.com@evil.test/watch?v=M7lc1UVf-VE",
    ])
      expect(youtubeId(u)).toBeNull();
  });
  it("rejects svg, oversize image and empty audio", () => {
    expect(
      validateFile({ type: "image/svg+xml", size: 10 }, "image"),
    ).toBeTruthy();
    expect(
      validateFile({ type: "image/jpeg", size: 9 * 1024 * 1024 }, "image"),
    ).toBeTruthy();
    expect(validateFile({ type: "audio/mpeg", size: 0 }, "audio")).toBeTruthy();
  });
  it("detects file bytes rather than trusting MIME label", () => {
    expect(
      detectMime(new TextEncoder().encode("<script>alert(1)</script>")),
    ).toBeNull();
    expect(detectMime(new Uint8Array([255, 216, 255, 1]))).toBe("image/jpeg");
    expect(detectMime(new TextEncoder().encode("RIFF0000WAVEabc"))).toBe(
      "audio/wav",
    );
  });
});
