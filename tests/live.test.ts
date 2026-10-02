import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultGift } from "../shared/model";
import { watchPublished } from "../src/lib/live";
let visibility: string;
beforeEach(() => {
  vi.useFakeTimers(); visibility = "visible";
  const doc = new EventTarget();
  Object.defineProperty(doc, "visibilityState", { get: () => visibility });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("Published content updates", () => {
  it("fetches after five seconds, resumes on focus, and stops cleanly", async () => {
    const read = vi.fn(async () => defaultGift), change = vi.fn(), locked = vi.fn();
    const stop = watchPublished(read, change, locked);
    await vi.advanceTimersByTimeAsync(4999); expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(change).toHaveBeenCalledWith(defaultGift);
    visibility = "hidden";
    await vi.advanceTimersByTimeAsync(5000); expect(read).toHaveBeenCalledTimes(1);
    visibility = "visible"; window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0); expect(read).toHaveBeenCalledTimes(2);
    stop(); await vi.advanceTimersByTimeAsync(10000);
    window.dispatchEvent(new Event("focus")); expect(read).toHaveBeenCalledTimes(2);
  });
  it("does not overlap requests or apply late responses after cleanup", async () => {
    let resolve!: (g: typeof defaultGift) => void;
    const read = vi.fn(() => new Promise<typeof defaultGift>((r) => { resolve = r; })), change = vi.fn();
    const stop = watchPublished(read, change, vi.fn());
    await vi.advanceTimersByTimeAsync(15000); expect(read).toHaveBeenCalledTimes(1);
    stop(); resolve(defaultGift); await vi.advanceTimersByTimeAsync(0);
    expect(change).not.toHaveBeenCalled();
  });
  it("requires a new unlock after a revoked session and tolerates temporary failures", async () => {
    const expired = Object.assign(new Error("expired"), { status: 401 });
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockRejectedValueOnce(expired);
    const locked = vi.fn(), change = vi.fn();
    const stop = watchPublished(read, change, locked);
    await vi.advanceTimersByTimeAsync(5000); expect(locked).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000); expect(locked).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled(); stop();
  });
});
