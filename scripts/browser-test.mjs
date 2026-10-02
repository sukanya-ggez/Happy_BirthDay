// Coordinate clicks avoid waiting for compositor stability in the headless test runtime.
// Navigation, visible results, disabled states, focus and actual media state are asserted below.
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
const output = path.resolve("test-results");
await fs.mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const root = path.resolve("dist");
const server = http.createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url, "http://localhost").pathname;
    let file = path.resolve(root, "." + requestPath);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await fs.stat(file)).isDirectory())
        file = path.join(file, "index.html");
    } catch {
      file = path.join(root, "index.html");
    }
    const bytes = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let options = { headless: true };
if (process.platform === "linux") {
  const { linuxChromium } = await import("./test-chromium.mjs");
  options = await linuxChromium(output);
}
const browser = await chromium.launch(options);
const errors = [];
const results = [];
function watch(p) {
  p.setDefaultTimeout(10000);
  p.on("pageerror", (e) => errors.push(e.message));
}
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
}
async function noOverflow(p) {
  expect(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
}
async function next(p) {
  await p.bringToFront();
  await p
    .getByRole("button", { name: "ถัดไป", exact: true })
    .click({ force: true, noWaitAfter: true });
}
const mockYT = `window.YT={Player:class{constructor(node,o){this.o=o;this.vol=70;this.muted=false;this.frame=document.createElement('iframe');this.frame.srcdoc='<p>YouTube API test double</p>';node.replaceWith(this.frame);setTimeout(()=>{o.events.onReady({target:this});if(o.videoId==='sF5zJj6vQbI')o.events.onError({target:this,data:150});},30);} getIframe(){return this.frame} destroy(){this.frame.remove()} setVolume(v){this.vol=v} getVolume(){return this.vol} mute(){this.muted=true} unMute(){this.muted=false} isMuted(){return this.muted} playVideo(){this.o.events.onStateChange({target:this,data:1})} pauseVideo(){this.o.events.onStateChange({target:this,data:2})}}};window.onYouTubeIframeAPIReady();`;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const p = await context.newPage();
  watch(p);
  await check("Desktop: envelope, flower skip, birthday dates", async () => {
    await p.goto(base);
    await expect(
      p.getByRole("button", { name: "แตะเปิดซองจดหมาย" }),
    ).toBeVisible();
    await p.screenshot({
      path: path.join(output, "envelope-desktop.png"),
      fullPage: true,
    });
    await noOverflow(p);
    await p
      .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
      .click({ force: true, noWaitAfter: true });
    await p
      .getByRole("button", { name: "ข้ามภาพเคลื่อนไหว" })
      .click({ force: true, noWaitAfter: true });
    await expect(
      p.getByRole("heading", { name: "Happy 19th Birthday", exact: true }),
    ).toBeVisible();
    await expect(p.getByText("3 October 2007", { exact: true })).toBeVisible();
    await noOverflow(p);
    await p.screenshot({
      path: path.join(output, "birthday-desktop.png"),
      fullPage: true,
    });
  });
  await check(
    "Candle action, replay, empty album, empty music, letter restart",
    async () => {
      await next(p);
      await p
        .getByRole("button", { name: "อธิษฐานแล้วเป่าเทียน" })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".cake-display")).toHaveClass(/blown/);
      await expect(p.getByRole("status")).toContainText("คำอธิษฐาน");
      await p
        .getByRole("button", { name: "เล่นใหม่", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(
        p.getByRole("button", { name: "อธิษฐานแล้วเป่าเทียน" }),
      ).toBeVisible();
      await next(p);
      await expect(p.locator(".album-photo")).toHaveCount(8);
      expect(await p.locator(".album-photo:disabled").count()).toBe(8);
      await next(p);
      await expect(
        p.getByRole("button", { name: "เล่นเพลง", exact: true }),
      ).toBeDisabled();
      await p.screenshot({
        path: path.join(output, "music-desktop.png"),
        fullPage: true,
      });
      await next(p);
      await expect(p.locator(".letter-body")).toContainText("[เขียนคำอวยพร");
      await p
        .getByRole("button", { name: "เปิดของขวัญอีกครั้ง" })
        .click({ force: true, noWaitAfter: true });
      await expect(
        p.getByRole("button", { name: "แตะเปิดซองจดหมาย" }),
      ).toBeVisible();
    },
  );
  await check(
    "Admin requires owner setup and accepts separate local owner account",
    async () => {
      await p.goto(base + "/admin");
      await expect(
        p.getByRole("button", { name: "ตั้งบัญชี Demo และเริ่มจัดการ" }),
      ).toBeVisible();
      expect(await p.locator(".editor-card").count()).toBe(0);
      await p.getByLabel("อีเมลเจ้าของ").fill("owner@example.test");
      await p.getByLabel("รหัสผ่านเจ้าของ").fill("browser-test-owner");
      await p
        .getByRole("button", { name: "ตั้งบัญชี Demo และเริ่มจัดการ" })
        .click({ force: true, noWaitAfter: true });
      await expect(
        p.getByRole("heading", { name: "ข้อความและวันเกิด" }),
      ).toBeVisible();
      await p.screenshot({
        path: path.join(output, "admin-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Saved draft stays private from recipient and preview shows unsaved draft",
    async () => {
      await p
        .getByLabel("คำอวยพรวันเกิด", { exact: true })
        .fill("PRIVATE DRAFT TEST");
      await p
        .getByRole("button", { name: "บันทึกฉบับร่าง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("status")).toContainText("บันทึกฉบับร่างแล้ว");
      const recipient = await context.newPage();
      watch(recipient);
      await recipient.goto(base);
      await recipient
        .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
        .click({ force: true, noWaitAfter: true });
      await recipient
        .getByRole("button", { name: "ข้ามภาพเคลื่อนไหว" })
        .click({ force: true, noWaitAfter: true });
      await expect(recipient.locator(".birthday-wish")).not.toContainText(
        "PRIVATE DRAFT TEST",
      );
      await recipient.close();
      await p
        .getByRole("button", { name: "ดูตัวอย่าง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "ข้ามภาพเคลื่อนไหว" })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".birthday-wish")).toContainText(
        "PRIVATE DRAFT TEST",
      );
      await p
        .getByRole("button", { name: "กลับไปแก้ไข" })
        .click({ force: true, noWaitAfter: true });
    },
  );
  await check(
    "Upload photo, crop, caption, reorder and confirm cancellation",
    async () => {
      await p
        .getByRole("button", { name: "รูปและอัลบั้ม", exact: true })
        .click({ force: true, noWaitAfter: true });
      const file = path.resolve("public/bouquet.webp");
      await p
        .locator(".photo-editor input[type=file]")
        .first()
        .setInputFiles(file);
      await expect(
        p.getByRole("dialog", { name: "เลือกตำแหน่งรูปในกรอบ" }),
      ).toBeVisible();
      await p.getByLabel("ตำแหน่งแนวนอน").fill("72");
      await p.getByLabel("ตำแหน่งแนวตั้ง").fill("34");
      await p
        .getByRole("button", { name: "ใช้ตำแหน่งนี้" })
        .click({ force: true, noWaitAfter: true });
      await p.getByLabel("คำบรรยายรูปที่ 1").fill("PHOTO TEST");
      await p
        .getByRole("button", { name: "เลื่อนรูปที่ 1 ลง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByLabel("คำบรรยายรูปที่ 2")).toHaveValue("PHOTO TEST");
      await p
        .getByRole("button", { name: "ลบช่องรูปที่ 2", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("dialog")).toBeVisible();
      await p
        .getByRole("button", { name: "ยกเลิก", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".photo-editor")).toHaveCount(8);
    },
  );
  const rate = 8000,
    seconds = 60;
  const wave = Buffer.alloc(44 + rate * seconds * 2);
  wave.write("RIFF");
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write("WAVE", 8);
  wave.write("fmt ", 12);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(rate, 24);
  wave.writeUInt32LE(rate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(wave.length - 44, 40);
  for (let i = 0; i < rate * seconds; i++)
    wave.writeInt16LE(
      Math.round(Math.sin((i / rate) * 2 * Math.PI * 220) * 2000),
      44 + i * 2,
    );
  await check("Audio upload and song link validation", async () => {
    await p
      .getByRole("button", { name: "เพลงของเธอ", exact: true })
      .click({ force: true, noWaitAfter: true });
    await p.getByLabel("ชื่อเพลงที่ 1").fill("Audio Test");
    await p.getByLabel("แหล่งเสียงเพลงที่ 1").selectOption("audio");
    await p
      .locator(".song-editor input[type=file]")
      .first()
      .setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: wave });
    await expect(
      p.getByText("มีไฟล์เสียงแล้ว · ดูตัวอย่างเพื่อทดลองฟัง"),
    ).toBeVisible();
    await p.getByLabel("ชื่อเพลงที่ 2").fill("YT Test");
    await p
      .getByLabel("ลิงก์ YouTube เพลงที่ 2")
      .fill("https://evil.test/watch?v=M7lc1UVf-VE");
    await p
      .getByRole("button", { name: "บันทึกฉบับร่าง", exact: true })
      .click({ force: true, noWaitAfter: true });
    await expect(p.getByRole("alert")).toContainText("YouTube");
    await p
      .getByLabel("ลิงก์ YouTube เพลงที่ 2")
      .fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
    await p.getByLabel("ชื่อเพลงที่ 3").fill("YT Blocked Test");
    await p
      .getByLabel("ลิงก์ YouTube เพลงที่ 3")
      .fill("https://youtu.be/sF5zJj6vQbI");
  });
  await check(
    "Configure recipient password and publish atomically",
    async () => {
      await p
        .getByRole("button", { name: "การเข้าถึงและสำรอง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p.getByLabel("ให้ใส่รหัสก่อนเปิดของขวัญ").check();
      await p.getByLabel("ตั้งหรือเปลี่ยนรหัสผู้รับ").fill("birthday-test");
      await p
        .getByRole("button", { name: "เผยแพร่เนื้อหา", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "ยืนยัน", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("status")).toContainText("เผยแพร่ฉบับ Demo");
    },
  );
  await check(
    "Recipient gate rejects wrong code then sees published content",
    async () => {
      await p.goto(base);
      await expect(p.getByLabel("รหัสเปิดของขวัญ")).toBeVisible();
      await p.getByLabel("รหัสเปิดของขวัญ").fill("wrong");
      await p
        .getByRole("button", { name: "เปิดของขวัญ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("alert")).toContainText("รหัสไม่ถูกต้อง");
      await p.getByLabel("รหัสเปิดของขวัญ").fill("birthday-test");
      await p
        .getByRole("button", { name: "เปิดของขวัญ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "ข้ามภาพเคลื่อนไหว" })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".birthday-wish")).toContainText(
        "PRIVATE DRAFT TEST",
      );
    },
  );
  await check(
    "Lightbox keyboard focus stays inside and returns on Escape",
    async () => {
      await next(p);
      await next(p);
      const open = p.getByRole("button", {
        name: "เปิดรูป PHOTO TEST",
        exact: true,
      });
      await open.click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("dialog")).toBeVisible();
      for (let i = 0; i < 7; i++) {
        await p.keyboard.press("Tab");
        expect(
          await p.evaluate(() => !!document.activeElement.closest("dialog")),
        ).toBe(true);
      }
      await p
        .getByRole("button", { name: "ถัดไป", exact: true })
        .filter({ has: p.locator("svg") })
        .last()
        .click({ force: true, noWaitAfter: true });
      await p.keyboard.press("Escape");
      await expect(p.getByRole("dialog")).not.toBeVisible();
      expect(await open.evaluate((el) => document.activeElement === el)).toBe(
        true,
      );
    },
  );
  await check(
    "Real audio play/pause controls, tape state and cleanup",
    async () => {
      await next(p);
      await expect(
        p.getByRole("button", { name: "เล่นเพลง", exact: true }),
      ).toBeEnabled();
      await p
        .getByRole("button", { name: "เล่นเพลง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".cassette")).toHaveClass(/is-playing/);
      expect(await p.locator("audio").evaluate((el) => el.paused)).toBe(false);
      await p
        .getByRole("button", { name: "ปิดเสียง", exact: true })
        .click({ force: true, noWaitAfter: true });
      expect(await p.locator("audio").evaluate((el) => el.muted)).toBe(true);
      await p
        .getByRole("button", { name: "หยุดเพลง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".cassette")).not.toHaveClass(/is-playing/);
      await next(p);
      await expect(p.locator("audio")).toHaveCount(0);
    },
  );
  await check(
    "YouTube API lifecycle and blocked-embed fallback (test double)",
    async () => {
      await p.route("https://www.youtube.com/iframe_api", (route) =>
        route.fulfill({ contentType: "application/javascript", body: mockYT }),
      );
      await p
        .getByRole("button", { name: "ย้อนกลับ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: /YT Test/ })
        .click({ force: true, noWaitAfter: true });
      await expect(
        p.getByRole("button", { name: "เล่นเพลง", exact: true }),
      ).toBeEnabled();
      await p
        .getByRole("button", { name: "เล่นเพลง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.locator(".cassette")).toHaveClass(/is-playing/);
      await expect(p.locator("iframe")).toHaveCount(1);
      await p
        .getByRole("button", { name: /YT Blocked Test/ })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("alert")).toContainText("ไม่อนุญาต");
      await expect(
        p.getByRole("link", { name: "เปิดบน YouTube" }),
      ).toBeVisible();
      await expect(p.locator("iframe")).toHaveCount(1);
      await next(p);
      await expect(p.locator("iframe")).toHaveCount(0);
    },
  );
  await check(
    "Published photo remains after deleting its draft reference",
    async () => {
      await p.goto(base + "/admin");
      await p.getByLabel("อีเมลเจ้าของ").fill("owner@example.test");
      await p.getByLabel("รหัสผ่านเจ้าของ").fill("browser-test-owner");
      await p
        .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "รูปและอัลบั้ม", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "ลบช่องรูปที่ 2", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "ยืนยัน", exact: true })
        .click({ force: true, noWaitAfter: true });
      await p
        .getByRole("button", { name: "บันทึกฉบับร่าง", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(p.getByRole("status")).toContainText("บันทึกฉบับร่างแล้ว");
      await p
        .getByRole("button", { name: "ออกจากระบบ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(
        p.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }),
      ).toBeVisible();
      expect(await p.locator(".editor-card").count()).toBe(0);
      const visitor = p;
      await visitor.goto(base);
      await visitor.getByLabel("รหัสเปิดของขวัญ").fill("birthday-test");
      await visitor
        .getByRole("button", { name: "เปิดของขวัญ", exact: true })
        .click({ force: true, noWaitAfter: true });
      await visitor
        .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
        .click({ force: true, noWaitAfter: true });
      await visitor
        .getByRole("button", { name: "ข้ามภาพเคลื่อนไหว" })
        .click({ force: true, noWaitAfter: true });
      await next(visitor);
      await next(visitor);
      await visitor
        .getByRole("button", { name: "เปิดรูป PHOTO TEST", exact: true })
        .click({ force: true, noWaitAfter: true });
      await expect(visitor.locator(".lightbox-image img")).toBeVisible();
    },
  );
  await context.close();
  await check(
    "Mobile 390px: all six screens, reduced motion, responsive admin",
    async () => {
      const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const m = await c.newPage();
      watch(m);
      await m.goto(base);
      await m.screenshot({
        path: path.join(output, "envelope-mobile.png"),
        fullPage: true,
      });
      await noOverflow(m);
      await m
        .getByRole("button", { name: "แตะเปิดซองจดหมาย" })
        .click({ force: true, noWaitAfter: true });
      await expect(
        m.getByRole("heading", { name: "Happy 19th Birthday", exact: true }),
      ).toBeVisible();
      await noOverflow(m);
      for (let i = 2; i <= 5; i++) {
        await next(m);
        await noOverflow(m);
      }
      await m.goto(base + "/admin");
      await m.getByLabel("อีเมลเจ้าของ").fill("mobile@example.test");
      await m.getByLabel("รหัสผ่านเจ้าของ").fill("mobile-owner-test");
      await m
        .getByRole("button", { name: "ตั้งบัญชี Demo และเริ่มจัดการ" })
        .click({ force: true, noWaitAfter: true });
      await noOverflow(m);
      await m
        .getByRole("button", { name: "เปิดเมนู" })
        .click({ force: true, noWaitAfter: true });
      await m
        .getByRole("button", { name: "รูปและอัลบั้ม", exact: true })
        .click({ force: true, noWaitAfter: true });
      await noOverflow(m);
      await m.screenshot({
        path: path.join(output, "admin-mobile.png"),
        fullPage: true,
      });
      await c.close();
    },
  );
  expect(errors).toEqual([]);
  await fs.writeFile(
    path.join(output, "browser-report.json"),
    JSON.stringify(
      {
        passed: results,
        uncaughtErrors: errors,
        youtube: "API test double; real network playback not verified",
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${results.length} browser scenarios, no uncaught errors.`,
  );
} catch (e) {
  await fs.writeFile(path.join(output, "browser-failure.txt"), String(e));
  for (const c of browser.contexts())
    for (const p of c.pages())
      await p
        .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
        .catch(() => {});
  throw e;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
