import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { demo } from "../src/lib/demo";
describe("Demo draft and recipient access", () => {
  it("rejects unauthenticated editor operations", async () => {
    await expect(demo.draft()).rejects.toThrow("เข้าสู่ระบบ");
    await expect(demo.publish(0)).rejects.toThrow("เข้าสู่ระบบ");
  });
  it("sets a separate owner login and keeps draft private until publish", async () => {
    await demo.login("test@example.test", "test-owner-password", true);
    let d = await demo.draft();
    const g = structuredClone(d.content);
    g.wish = "DRAFT SECRET";
    d = await demo.save(g, { enabled: true, newCode: "gift-code" }, d.version);
    expect((await demo.published()).wish).not.toBe("DRAFT SECRET");
    await expect(
      demo.save(g, { enabled: false }, d.version - 1),
    ).rejects.toThrow("เปลี่ยน");
    d = await demo.publish(d.version);
    await expect(demo.published()).rejects.toThrow("ใส่รหัส");
    await expect(demo.unlock("wrong")).rejects.toThrow("ไม่ถูกต้อง");
    await demo.unlock("gift-code");
    expect((await demo.published()).wish).toBe("DRAFT SECRET");
  });
  it("rejects unpublished file paths for recipients", async () => {
    await expect(
      demo.blob({
        id: "x",
        path: "media/x.jpg",
        kind: "image",
        mime: "image/jpeg",
        x: 50,
        y: 50,
      }),
    ).rejects.toThrow("ยังไม่เผยแพร่");
  });
  it("logs out owner independently of recipient", async () => {
    await demo.logout();
    await expect(demo.draft()).rejects.toThrow("เข้าสู่ระบบ");
    expect((await demo.published()).wish).toBe("DRAFT SECRET");
  });
});
