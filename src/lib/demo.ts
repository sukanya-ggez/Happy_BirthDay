import {
  defaultGift,
  allMedia,
  validateGift,
  validateFile,
  detectMime,
} from "../../shared/model";
import type { Draft, Gift, GateChange, Media } from "../../shared/model";
const DB = "happy-birthday-v1";
let owner = false,
  unlocked = false;
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("state");
      r.result.createObjectStore("assets");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          "เปิดพื้นที่บันทึกไม่ได้ กรุณาเปิดอนุญาตพื้นที่จัดเก็บในเบราว์เซอร์",
        ),
      );
  });
}
async function read<T>(key: string, store = "state"): Promise<T | undefined> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = d.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => {
      d.close();
      res(r.result);
    };
    r.onerror = () => {
      d.close();
      rej(r.error);
    };
  });
}
async function write(key: string, value: unknown, store = "state") {
  const d = await db();
  return new Promise<void>((res, rej) => {
    const t = d.transaction(store, "readwrite");
    t.objectStore(store).put(value, key);
    t.oncomplete = () => {
      d.close();
      res();
    };
    t.onerror = () => {
      d.close();
      rej(new Error("บันทึกไม่สำเร็จ พื้นที่อุปกรณ์อาจเต็ม"));
    };
  });
}
export async function hashPassword(p: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(p),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bytes = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 210000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
type Password = { salt: string; hash: string };
type State = {
  draft: Gift;
  published: Gift;
  draftGate: { enabled: boolean; password: Password | null };
  publishedGate: { enabled: boolean; password: Password | null };
  version: number;
  publishedAt: string | null;
};
async function state() {
  const s = await read<State>("gift");
  return (
    s ?? {
      draft: structuredClone(defaultGift),
      published: structuredClone(defaultGift),
      draftGate: { enabled: false, password: null },
      publishedGate: { enabled: false, password: null },
      version: 0,
      publishedAt: null,
    }
  );
}
function requireOwner() {
  if (!owner) throw new Error("กรุณาเข้าสู่ระบบเจ้าของก่อน");
}
export const demo = {
  async hasOwner() {
    return !!(await read("owner"));
  },
  async login(email: string, password: string, setup = false) {
    const account = await read<{ email: string; password: Password }>("owner");
    if (!account) {
      if (!setup) throw new Error("กรุณาตั้งบัญชีเจ้าของ Demo ก่อน");
      if (password.length < 8)
        throw new Error("รหัสเจ้าของอย่างน้อย 8 ตัวอักษร");
      const salt = crypto.randomUUID();
      await write("owner", {
        email: email.toLowerCase(),
        password: { salt, hash: await hashPassword(password, salt) },
      });
      owner = true;
      return;
    }
    if (
      account.email !== email.toLowerCase() ||
      (await hashPassword(password, account.password.salt)) !==
        account.password.hash
    )
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    owner = true;
  },
  async logout() {
    owner = false;
  },
  async isOwner() {
    return owner;
  },
  async config() {
    return { enabled: (await state()).publishedGate.enabled };
  },
  async unlock(code: string) {
    const s = await state();
    if (s.publishedGate.enabled) {
      const p = s.publishedGate.password;
      if (!p || (await hashPassword(code, p.salt)) !== p.hash)
        throw new Error("รหัสไม่ถูกต้อง ลองอีกครั้งนะ");
    }
    unlocked = true;
  },
  async published() {
    const s = await state();
    if (s.publishedGate.enabled && !unlocked)
      throw new Error("กรุณาใส่รหัสก่อนเปิดของขวัญ");
    return structuredClone(s.published);
  },
  async draft(): Promise<Draft> {
    requireOwner();
    const s = await state();
    return {
      content: structuredClone(s.draft),
      gate: { enabled: s.draftGate.enabled, hasCode: !!s.draftGate.password },
      version: s.version,
      publishedAt: s.publishedAt,
    };
  },
  async save(content: Gift, gate: GateChange, version: number): Promise<Draft> {
    requireOwner();
    const errors = validateGift(content);
    if (errors.length) throw new Error(errors.join("\n"));
    const s = await state();
    if (s.version !== version)
      throw new Error("ข้อมูลเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดหน้าจัดการใหม่");
    let password = s.draftGate.password;
    if (gate.newCode) {
      if (
        gate.newCode.length < 4 ||
        gate.newCode.length > 128 ||
        new TextEncoder().encode(gate.newCode).length > 72
      )
        throw new Error(
          "รหัสผู้รับอย่างน้อย 4 ตัวอักษร และไม่เกิน 72 ไบต์ UTF-8",
        );
      const salt = crypto.randomUUID();
      password = { salt, hash: await hashPassword(gate.newCode, salt) };
    }
    if (gate.enabled && !password)
      throw new Error("กรุณาตั้งรหัสผู้รับก่อนเปิดใช้");
    s.draft = structuredClone(content);
    s.draftGate = { enabled: gate.enabled, password };
    s.version++;
    await write("gift", s);
    return this.draft();
  },
  async publish(version: number): Promise<Draft> {
    requireOwner();
    const s = await state();
    if (s.version !== version) throw new Error("ฉบับร่างเปลี่ยน กรุณาโหลดใหม่");
    s.published = structuredClone(s.draft);
    s.publishedGate = structuredClone(s.draftGate);
    s.publishedAt = new Date().toISOString();
    s.version++;
    unlocked = false;
    await write("gift", s);
    return this.draft();
  },
  async upload(file: File, kind: "image" | "audio"): Promise<Media> {
    requireOwner();
    const error = validateFile(file, kind);
    if (error) throw new Error(error);
    const actual = detectMime(
      new Uint8Array(await file.slice(0, 64).arrayBuffer()),
    );
    if (!actual || !actual.startsWith(kind === "image" ? "image/" : "audio/"))
      throw new Error("เนื้อหาไฟล์ไม่ตรงกับชนิดที่อนุญาต");
    const id = crypto.randomUUID();
    const ext = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
      } as Record<string, string>
    )[actual];
    const path = `media/${id}.${ext}`;
    await write(path, new Blob([file], { type: actual }), "assets");
    return { id, path, kind, mime: actual, x: 50, y: 50 };
  },
  async blob(media: Media, admin = false) {
    if (admin) requireOwner();
    else {
      const g = await this.published();
      if (!allMedia(g).some((m) => m.path === media.path))
        throw new Error("ไฟล์นี้ยังไม่เผยแพร่");
    }
    const b = await read<Blob>(media.path, "assets");
    if (!b) throw new Error("ไม่พบไฟล์ในอุปกรณ์นี้");
    return b;
  },
};
