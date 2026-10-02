import { createClient } from "@supabase/supabase-js";
import { demo } from "./demo";
import { allMedia } from "../../shared/model";
import type { Gift, Draft, GateChange, Media } from "../../shared/model";
const url = import.meta.env.VITE_SUPABASE_URL?.trim(),
  key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const mode = import.meta.env.VITE_APP_MODE || "demo";
export const isDemo = mode === "demo";
export const configurationError = !["demo", "online"].includes(mode)
  ? "VITE_APP_MODE ต้องเป็น demo หรือ online"
  : !isDemo && (!url || !key)
    ? "โหมดออนไลน์ยังตั้งค่าไม่ครบ: เติม VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env แล้วเริ่มเว็บใหม่"
    : !isDemo &&
        url &&
        !/^https:\/\/[^/]+\.supabase\.co$|^http:\/\/(localhost|127\.0\.0\.1):54321$/.test(
          url,
        )
      ? "VITE_SUPABASE_URL ไม่ถูกต้อง ใช้ URL ของโปรเจกต์ Supabase หรือ local Supabase ตาม README"
      : null;
const supabase =
  !isDemo && !configurationError
    ? createClient(url!, key!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
let recipientToken = "";
async function request(
  action: string,
  body: unknown = {},
  admin = false,
  form?: FormData,
): Promise<Response> {
  if (configurationError) throw new Error(configurationError);
  if (!supabase) throw new Error("ยังไม่ได้เชื่อม Supabase");
  const headers: Record<string, string> = { apikey: key! };
  if (admin) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("กรุณาเข้าสู่ระบบเจ้าของ");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (recipientToken && !admin) headers["X-Gift-Session"] = recipientToken;
  if (!form) headers["Content-Type"] = "application/json";
  let r: Response;
  try {
    r = await fetch(`${url}/functions/v1/gift-api?action=${action}`, {
      method: "POST",
      headers,
      body: form ?? JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "เชื่อมต่อ Supabase ไม่สำเร็จ ตรวจ URL อินเทอร์เน็ต และ ALLOWED_ORIGINS ตาม README",
    );
  }
  if (!r.ok) {
    let message =
      r.status === 404
        ? "ยังไม่พบ Edge Function gift-api กรุณาติดตั้งตาม README"
        : "เชื่อมต่อไม่สำเร็จ ตรวจการตั้งค่า Supabase ตาม README";
    try {
      message = (await r.json()).error || message;
    } catch {
      /* safe fallback */
    }
    if (r.status === 401 && !admin) recipientToken = "";
    throw new Error(message);
  }
  return r;
}
async function json<T>(
  action: string,
  body: unknown = {},
  admin = false,
): Promise<T> {
  return (await request(action, body, admin)).json();
}
export const service = {
  async hasOwner() {
    return isDemo ? demo.hasOwner() : true;
  },
  async login(email: string, password: string, setup = false) {
    if (isDemo) return demo.login(email, password, setup);
    if (!supabase) throw new Error(configurationError || "ยังไม่ได้เชื่อมระบบ");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (/api key/i.test(error.message))
        throw new Error(
          "ตรวจ VITE_SUPABASE_ANON_KEY ให้ตรงกับโปรเจกต์ Supabase แล้วเริ่มเว็บใหม่",
        );
      if ((error.status ?? 0) >= 500 || /fetch|network/i.test(error.message))
        throw new Error(
          "เชื่อมต่อบัญชีไม่ได้ ตรวจอินเทอร์เน็ตและ VITE_SUPABASE_URL",
        );
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    try {
      await json("admin-draft", {}, true);
    } catch (e) {
      await supabase.auth.signOut();
      throw e;
    }
  },
  async logout() {
    if (isDemo) await demo.logout();
    else await supabase?.auth.signOut();
  },
  async isOwner() {
    if (isDemo) return demo.isOwner();
    try {
      await json("admin-draft", {}, true);
      return true;
    } catch {
      return false;
    }
  },
  async config(): Promise<{ enabled: boolean }> {
    return isDemo ? demo.config() : json("config");
  },
  async unlock(code: string) {
    if (isDemo) return demo.unlock(code);
    const r = await json<{ token: string }>("unlock", { code });
    recipientToken = r.token;
  },
  async published(): Promise<Gift> {
    return isDemo ? demo.published() : json("content");
  },
  async draft(): Promise<Draft> {
    return isDemo ? demo.draft() : json("admin-draft", {}, true);
  },
  async save(g: Gift, gate: GateChange, version: number): Promise<Draft> {
    return isDemo
      ? demo.save(g, gate, version)
      : json("admin-save", { content: g, gate, version }, true);
  },
  async publish(version: number): Promise<Draft> {
    return isDemo
      ? demo.publish(version)
      : json("admin-publish", { version }, true);
  },
  async upload(f: File, kind: "image" | "audio"): Promise<Media> {
    if (isDemo) return demo.upload(f, kind);
    const form = new FormData();
    form.append("file", f);
    form.append("kind", kind);
    return (await request("admin-upload", {}, true, form)).json();
  },
  async blob(m: Media, admin = false): Promise<Blob> {
    return isDemo
      ? demo.blob(m, admin)
      : (
          await request(
            admin ? "admin-asset" : "asset",
            { path: m.path },
            admin,
          )
        ).blob();
  },
  async backup() {
    const d = await this.draft();
    const files: Record<string, string> = {};
    for (const m of allMedia(d.content)) {
      if (files[m.path]) continue;
      const b = await this.blob(m, true);
      files[m.path] = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(b);
      });
    }
    return {
      format: "happy-birthday-backup-v1",
      exportedAt: new Date().toISOString(),
      draft: d,
      files,
    };
  },
};
