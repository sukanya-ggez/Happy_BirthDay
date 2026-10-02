import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import {
  allMedia,
  detectMime,
  validateFile,
  validateGift,
} from "../_shared/model.ts";
import type { Gift } from "../_shared/model.ts";
const url = Deno.env.get("SUPABASE_URL") ?? "",
  secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const origins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const pepper = Deno.env.get("RATE_LIMIT_SECRET") ?? "";
const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "content-type, authorization, apikey, x-gift-session",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin && origins.includes(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  try {
    if (!url || !secret || !origins.length || pepper.length < 32)
      throw new ApiError(
        "ตั้งค่า Edge Function ไม่ครบ: ต้องมี ALLOWED_ORIGINS และ RATE_LIMIT_SECRET อย่างน้อย 32 ตัวอักษร",
        503,
      );
    if (origin && !origins.includes(origin))
      throw new ApiError(
        "ไม่อนุญาตเว็บไซต์ต้นทางนี้ ตรวจ ALLOWED_ORIGINS",
        403,
      );
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (req.method !== "POST") throw new ApiError("ใช้ POST เท่านั้น", 405);
    const action = new URL(req.url).searchParams.get("action") ?? "";
    const known = [
      "config",
      "unlock",
      "content",
      "asset",
      "admin-draft",
      "admin-save",
      "admin-publish",
      "admin-upload",
      "admin-asset",
    ];
    if (!known.includes(action)) throw new ApiError("ไม่พบ API", 404);
    let ownerId: string | null = null;
    // Never trust JWT claims/client role or anon key as authorization.
    if (action.startsWith("admin-")) {
      const authorization = req.headers.get("authorization") ?? "";
      if (!authorization.startsWith("Bearer "))
        throw new ApiError("กรุณาเข้าสู่ระบบเจ้าของ", 401);
      const { data, error } = await db.auth.getUser(authorization.slice(7));
      if (error || !data.user)
        throw new ApiError("บัญชีหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
      const membership = await db
        .from("gift_admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (membership.error)
        throw new ApiError("ตรวจสิทธิ์ไม่สำเร็จ ตรวจ SQL migrations", 503);
      if (!membership.data)
        throw new ApiError(
          "บัญชีนี้ไม่มีสิทธิ์เจ้าของ ให้เพิ่ม user_id ใน gift_admins ตาม README",
          403,
        );
      ownerId = data.user.id;
    }
    const { data: row, error: rowError } = await db
      .from("gift")
      .select("*")
      .eq("id", 1)
      .single();
    if (rowError || !row)
      throw new ApiError(
        "ยังไม่มีฐานข้อมูลของขวัญ กรุณารัน SQL migrations ตาม README",
        503,
      );
    const draftResponse = async () => {
      const { data: r, error: e } = await db
        .from("gift")
        .select("*")
        .eq("id", 1)
        .single();
      if (e) throw new ApiError("อ่านฉบับร่างไม่สำเร็จ", 503);
      return respond({
        content: r.draft,
        gate: { enabled: r.draft_gate_enabled, hasCode: !!r.draft_code_hash },
        version: r.version,
        publishedAt: r.published_at,
      });
    };
    // Stream request bodies with bounds; reject dishonest Content-Length too.
    async function boundedBody(max: number) {
      const reader = req.body?.getReader();
      if (!reader) return new Uint8Array();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        size += r.value.length;
        if (size > max) {
          await reader.cancel();
          throw new ApiError("ข้อมูลหรือไฟล์ใหญ่เกินกำหนด", 413);
        }
        chunks.push(r.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
      }
      return bytes;
    }
    let body: Record<string, unknown> = {};
    if (action !== "admin-upload") {
      try {
        body = JSON.parse(new TextDecoder().decode(await boundedBody(100000)));
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("ข้อมูล JSON ไม่ถูกต้อง");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new ApiError("รูปแบบข้อมูลไม่ถูกต้อง");
    }
    async function recipientAuthorized() {
      if (!row.gate_enabled) return;
      const token = req.headers.get("x-gift-session") ?? "";
      if (!/^[0-9a-f]{64}$/.test(token))
        throw new ApiError("กรุณาใส่รหัสก่อนเปิดของขวัญ", 401);
      const s = await db
        .from("gift_sessions")
        .select("revision,expires_at")
        .eq("token_hash", await hash(token))
        .maybeSingle();
      if (
        s.error ||
        !s.data ||
        s.data.revision !== row.published_revision ||
        Date.parse(s.data.expires_at) <= Date.now()
      )
        throw new ApiError(
          "รหัสเปิดของขวัญหมดอายุ กรุณาเปิดหน้าเว็บใหม่แล้วใส่รหัสอีกครั้ง",
          401,
        );
    }
    if (action === "config") return respond({ enabled: row.gate_enabled });
    if (action === "unlock") {
      if (
        typeof body.code !== "string" ||
        body.code.length > 128 ||
        new TextEncoder().encode(body.code).length > 72
      )
        throw new ApiError("รหัสไม่ถูกต้อง");
      // Global limit remains effective even if untrusted IP headers are spoofed.
      const ip =
        (
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip") ??
          "unknown"
        )
          .split(",")
          .at(-1)
          ?.trim() ?? "unknown";
      for (const [scope, limit] of [
        [ip, 5],
        ["global", 100],
      ] as const) {
        const r = await db.rpc("consume_gift_attempt", {
          p_key: await hash(pepper + ":" + scope),
          p_limit: limit,
        });
        if (r.error)
          throw new ApiError("ตรวจรหัสไม่สำเร็จ ตรวจ SQL migrations", 503);
        if (!r.data)
          throw new ApiError(
            "ลองรหัสบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่",
            429,
          );
      }
      const valid = await db.rpc("verify_gift_code", { p_code: body.code });
      if (valid.error) throw new ApiError("ตรวจรหัสไม่สำเร็จ", 503);
      if (!valid.data) throw new ApiError("รหัสไม่ถูกต้อง ลองอีกครั้งนะ", 401);
      const token = randomToken();
      const insert = await db
        .from("gift_sessions")
        .insert({
          token_hash: await hash(token),
          revision: row.published_revision,
          expires_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        });
      if (insert.error) throw new ApiError("สร้าง session ไม่สำเร็จ", 503);
      return respond({ token, expiresIn: 7200 });
    }
    if (action === "content") {
      await recipientAuthorized();
      return respond(row.published);
    }
    if (action === "asset" || action === "admin-asset") {
      const path = body.path;
      if (typeof path !== "string") throw new ApiError("ไฟล์ไม่ถูกต้อง");
      if (action === "asset") {
        await recipientAuthorized();
        if (!allMedia(row.published as Gift).some((m) => m.path === path))
          throw new ApiError("ไม่พบไฟล์ในฉบับเผยแพร่", 404);
      } else {
        const a = await db
          .from("gift_assets")
          .select("path")
          .eq("path", path)
          .maybeSingle();
        if (a.error || !a.data) throw new ApiError("ไม่พบไฟล์", 404);
      }
      const result = await db.storage.from("gift-media").download(path);
      if (result.error || !result.data)
        throw new ApiError("ไม่พบไฟล์ใน Storage", 404);
      return new Response(result.data, {
        headers: {
          ...headers,
          "Content-Type": result.data.type,
          "Content-Disposition": "inline",
        },
      });
    }
    if (action === "admin-draft") return await draftResponse();
    if (action === "admin-save") {
      const errors = validateGift(body.content);
      if (errors.length) throw new ApiError(errors.join("\n"));
      if (
        !Number.isInteger(body.version) ||
        !body.gate ||
        typeof body.gate !== "object"
      )
        throw new ApiError("ฉบับร่างไม่ถูกต้อง");
      const gate = body.gate as { enabled: boolean; newCode?: string };
      if (typeof gate.enabled !== "boolean")
        throw new ApiError("การตั้งค่ารหัสไม่ถูกต้อง");
      if (
        gate.newCode !== undefined &&
        (typeof gate.newCode !== "string" ||
          gate.newCode.length < 4 ||
          gate.newCode.length > 128 ||
          new TextEncoder().encode(gate.newCode).length > 72)
      )
        throw new ApiError(
          "รหัสผู้รับต้องมีอย่างน้อย 4 ตัวอักษร และไม่เกิน 72 ไบต์ UTF-8",
        );
      if (gate.enabled && !gate.newCode && !row.draft_code_hash)
        throw new ApiError("กรุณาตั้งรหัสผู้รับก่อนเปิดใช้");
      for (const m of allMedia(body.content as Gift)) {
        const a = await db
          .from("gift_assets")
          .select("kind,mime")
          .eq("path", m.path)
          .maybeSingle();
        if (
          a.error ||
          !a.data ||
          a.data.kind !== m.kind ||
          a.data.mime !== m.mime
        )
          throw new ApiError("รูปหรือเพลงอ้างอิงไฟล์ที่ไม่ได้อัปโหลด");
      }
      const result = await db.rpc("save_gift_draft", {
        p_content: body.content,
        p_enabled: gate.enabled,
        p_code: gate.newCode ?? null,
        p_version: body.version,
      });
      if (result.error)
        throw new ApiError(
          "บันทึกไม่สำเร็จ ตรวจ migrations และลองอีกครั้ง",
          503,
        );
      if (!result.data)
        throw new ApiError(
          "ฉบับร่างเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดหน้าจัดการใหม่",
          409,
        );
      return await draftResponse();
    }
    if (action === "admin-publish") {
      if (!Number.isInteger(body.version))
        throw new ApiError("เวอร์ชันไม่ถูกต้อง");
      const result = await db.rpc("publish_gift", { p_version: body.version });
      if (result.error)
        throw new ApiError("เผยแพร่ไม่สำเร็จ ตรวจ migrations", 503);
      if (!result.data)
        throw new ApiError("ฉบับร่างเปลี่ยน กรุณาโหลดใหม่", 409);
      return await draftResponse();
    }
    if (action === "admin-upload") {
      const bytes = await boundedBody(20 * 1024 * 1024 + 65536);
      const form = await new Response(bytes, {
        headers: { "Content-Type": req.headers.get("content-type") ?? "" },
      }).formData();
      const f = form.get("file"),
        kind = form.get("kind");
      if (!(f instanceof File) || !["image", "audio"].includes(kind as string))
        throw new ApiError("ไฟล์ไม่ถูกต้อง");
      const fileError = validateFile(f, kind as "image" | "audio");
      if (fileError) throw new ApiError(fileError);
      const actual = detectMime(
        new Uint8Array(await f.slice(0, 64).arrayBuffer()),
      );
      if (!actual || !actual.startsWith(kind === "image" ? "image/" : "audio/"))
        throw new ApiError("เนื้อหาไฟล์ไม่ตรงชนิดที่อนุญาต");
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
      const id = crypto.randomUUID(),
        path = `media/${id}.${ext}`;
      const upload = await db.storage
        .from("gift-media")
        .upload(path, f, {
          contentType: actual,
          upsert: false,
          cacheControl: "0",
        });
      if (upload.error)
        throw new ApiError(
          "อัปโหลดไม่สำเร็จ ตรวจ bucket gift-media และสิทธิ์ตาม README",
          503,
        );
      const insert = await db
        .from("gift_assets")
        .insert({
          path,
          kind,
          mime: actual,
          size_bytes: f.size,
          uploaded_by: ownerId,
        });
      if (insert.error) {
        await db.storage.from("gift-media").remove([path]);
        throw new ApiError("บันทึกข้อมูลไฟล์ไม่สำเร็จ", 503);
      }
      return respond({ id, path, kind, mime: actual, x: 50, y: 50 });
    }
    throw new ApiError("ไม่พบ API", 404);
  } catch (e) {
    return respond(
      {
        error:
          e instanceof ApiError
            ? e.message
            : "ระบบไม่พร้อมใช้งาน กรุณาตรวจการตั้งค่า Supabase และลองใหม่",
      },
      e instanceof ApiError ? e.status : 500,
    );
  }
});
