import { describe, it, expect, vi } from "vitest";
import { defaultGift } from "../shared/model";
import type { Draft, Media } from "../shared/model";
import { prepareBackup, restoreBackup } from "../src/lib/backup";

function backup() {
  const gift = structuredClone(defaultGift);
  gift.wish = "จากฉบับสำรอง";
  gift.hero = { id: "photo", path: "media/photo.webp", kind: "image", mime: "image/webp", x: 72, y: 34 };
  gift.photos[0].media = { ...gift.hero, x: 12 };
  const bytes = Buffer.from("RIFF0000WEBPVP8 test");
  return { format: "happy-birthday-backup-v1", draft: { content: gift }, files: { "media/photo.webp": `data:image/webp;base64,${bytes.toString("base64")}` } };
}
function api() {
  const current: Draft = { content: structuredClone(defaultGift), gate: { enabled: true, hasCode: true }, version: 8, publishedAt: null };
  const media: Media = { id: "new", path: "media/new.webp", kind: "image", mime: "image/webp", x: 50, y: 50 };
  return {
    draft: vi.fn(async () => current),
    upload: vi.fn(async () => media),
    save: vi.fn(async (content, gate, version) => ({ ...current, content, gate, version: version + 1 })),
  };
}
describe("Backup migration to the current authenticated editor", () => {
  it("uploads shared files once, preserves crops, and saves only a draft with the existing access code", async () => {
    const a = api();
    const progress = vi.fn();
    const next = await restoreBackup(backup(), a, progress);
    expect(a.upload).toHaveBeenCalledTimes(1);
    expect(next.content.hero).toMatchObject({ path: "media/new.webp", x: 72, y: 34 });
    expect(next.content.photos[0].media).toMatchObject({ path: "media/new.webp", x: 12 });
    expect(a.save).toHaveBeenCalledWith(next.content, { enabled: true }, 8);
    expect(progress).toHaveBeenLastCalledWith(1, 1);
  });
  it("rejects incomplete media before calling any API", async () => {
    const b = backup(); b.files = {} as typeof b.files;
    const a = api();
    await expect(restoreBackup(b, a)).rejects.toThrow("ขาดรูปหรือเสียง");
    expect(a.draft).not.toHaveBeenCalled();
    expect(a.upload).not.toHaveBeenCalled();
    expect(a.save).not.toHaveBeenCalled();
  });
  it("rejects broken format, paths, base64 and disguised media", () => {
    expect(() => prepareBackup({})).toThrow("รูปแบบ");
    const path = backup(); path.draft.content.hero!.path = "../secret";
    expect(() => prepareBackup(path)).toThrow("รูปหลัก");
    const bad = backup(); bad.files["media/photo.webp"] = "data:image/webp;base64,@@@=";
    expect(() => prepareBackup(bad)).toThrow("ไม่ถูกต้อง");
    const disguised = backup(); disguised.files["media/photo.webp"] = "data:image/webp;base64,aGVsbG8=";
    expect(() => prepareBackup(disguised)).toThrow("ไม่ตรง");
  });
  it("leaves the old draft untouched when an upload fails", async () => {
    const a = api(); a.upload.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(restoreBackup(backup(), a)).rejects.toThrow("Upload failed");
    expect(a.save).not.toHaveBeenCalled();
  });
  it("preserves the optimistic version check on concurrent edits", async () => {
    const a = api(); a.save.mockRejectedValueOnce(new Error("ฉบับร่างเปลี่ยน"));
    await expect(restoreBackup(backup(), a)).rejects.toThrow("ฉบับร่างเปลี่ยน");
    expect(a.save.mock.calls[0][2]).toBe(8);
  });
});
