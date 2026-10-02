import { beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { defaultGift } from "../shared/model";
const f = vi.hoisted(() => ({
  db: {} as any,
  row: {} as any,
  session: null as any,
  downloads: 0,
  attempts: new Map<string, number>(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => f.db }));
let handler: (req: Request) => Promise<Response>;
const token = "ab".repeat(32);
function request(
  action: string,
  body: unknown = {},
  extra: Record<string, string> = {},
) {
  return new Request(
    `https://project.supabase.co/functions/v1/gift-api?action=${action}`,
    {
      method: "POST",
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/json",
        ...extra,
      },
      body: JSON.stringify(body),
    },
  );
}
beforeAll(async () => {
  f.db.auth = {
    getUser: async (jwt: string) => ({
      data: { user: ["owner", "outsider"].includes(jwt) ? { id: jwt } : null },
      error: !["owner", "outsider"].includes(jwt),
    }),
  };
  f.db.from = (table: string) => {
    const filters: Record<string, unknown> = {};
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => {
        filters[k] = v;
        return q;
      },
      single: async () => ({ data: structuredClone(f.row), error: null }),
      maybeSingle: async () => ({
        data:
          table === "gift_admins"
            ? filters.user_id === "owner"
              ? { user_id: "owner" }
              : null
            : table === "gift_sessions"
              ? f.session
              : table === "gift_assets" &&
                  filters.path === "media/published.jpg"
                ? {
                    path: "media/published.jpg",
                    kind: "image",
                    mime: "image/jpeg",
                  }
                : null,
        error: null,
      }),
      insert: async () => ({ error: null }),
    };
    return q;
  };
  f.db.rpc = async (name: string, args: any) => {
    if (name === "consume_gift_attempt") {
      const count = f.attempts.get(args.p_key) ?? 0;
      f.attempts.set(args.p_key, count + 1);
      return { data: count < args.p_limit, error: null };
    }
    if (name === "verify_gift_code")
      return { data: args.p_code === "correct", error: null };
    return { data: false, error: null };
  };
  f.db.storage = {
    from: () => ({
      download: async () => {
        f.downloads++;
        return {
          data: new Blob(["image-bytes"], { type: "image/jpeg" }),
          error: null,
        };
      },
    }),
  };
  const env = {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test-secret",
    ALLOWED_ORIGINS: "http://localhost:5173",
    RATE_LIMIT_SECRET: "a".repeat(64),
  };
  vi.stubGlobal("Deno", {
    env: { get: (name: keyof typeof env) => env[name] },
    serve: (h: typeof handler) => {
      handler = h;
    },
  });
  await import("../supabase/functions/gift-api/index");
});
beforeEach(() => {
  const published = structuredClone(defaultGift);
  published.hero = {
    id: "published",
    path: "media/published.jpg",
    mime: "image/jpeg",
    kind: "image",
    x: 50,
    y: 50,
  };
  f.row = {
    id: 1,
    draft: { ...defaultGift, wish: "TOP SECRET DRAFT" },
    published,
    gate_enabled: true,
    draft_gate_enabled: true,
    draft_code_hash: "HASH",
    code_hash: "HASH",
    version: 1,
    published_revision: 4,
    published_at: null,
  };
  f.session = null;
  f.downloads = 0;
  f.attempts.clear();
});
describe("Edge handler authorization (mock Supabase transport, real handler)", () => {
  it("public config exposes only gate state", async () => {
    const r = await handler(request("config"));
    expect(await r.json()).toEqual({ enabled: true });
  });
  it("denies anonymous, invalid owner token, and unlisted account writes", async () => {
    for (const auth of ["", "Bearer forged", "Bearer outsider"]) {
      const r = await handler(
        request("admin-save", {}, auth ? { authorization: auth } : {}),
      );
      expect([401, 403]).toContain(r.status);
    }
  });
  it("owner draft response omits gate hash and publishes nothing implicitly", async () => {
    const r = await handler(
      request("admin-draft", {}, { authorization: "Bearer owner" }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.content.wish).toBe("TOP SECRET DRAFT");
    expect(JSON.stringify(body)).not.toContain("HASH");
    expect(f.row.published.wish).not.toBe("TOP SECRET DRAFT");
  });
  it("gated content and image API reject missing and forged sessions without storage download", async () => {
    for (const action of ["content", "asset"])
      for (const s of ["", "ff".repeat(32)]) {
        const r = await handler(
          request(
            action,
            { path: "media/published.jpg" },
            s ? { "x-gift-session": s } : {},
          ),
        );
        expect(r.status).toBe(401);
      }
    expect(f.downloads).toBe(0);
  });
  it("valid session only reads published content and published image, never draft path", async () => {
    f.session = {
      token_hash: createHash("sha256").update(token).digest("hex"),
      revision: 4,
      expires_at: new Date(Date.now() + 10000).toISOString(),
    };
    const h = { "x-gift-session": token };
    const r = await handler(request("content", {}, h));
    expect(r.status).toBe(200);
    expect((await r.json()).wish).not.toBe("TOP SECRET DRAFT");
    expect(
      (await handler(request("asset", { path: "media/draft.jpg" }, h))).status,
    ).toBe(404);
    expect(f.downloads).toBe(0);
    expect(
      (await handler(request("asset", { path: "media/published.jpg" }, h)))
        .status,
    ).toBe(200);
    expect(f.downloads).toBe(1);
  });
  it("expired or previous publication sessions are rejected", async () => {
    f.session = {
      revision: 3,
      expires_at: new Date(Date.now() + 10000).toISOString(),
    };
    expect(
      (await handler(request("content", {}, { "x-gift-session": token })))
        .status,
    ).toBe(401);
    f.session = {
      revision: 4,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    expect(
      (
        await handler(
          request(
            "asset",
            { path: "media/published.jpg" },
            { "x-gift-session": token },
          ),
        )
      ).status,
    ).toBe(401);
  });
  it("wrong code is limited and successful unlock returns only session token", async () => {
    for (let i = 0; i < 5; i++)
      expect((await handler(request("unlock", { code: "wrong" }))).status).toBe(
        401,
      );
    expect((await handler(request("unlock", { code: "wrong" }))).status).toBe(
      429,
    );
    f.attempts.clear();
    const r = await handler(request("unlock", { code: "correct" }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.token).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(body).sort()).toEqual(["expiresIn", "token"]);
  });
  it("rejects bad data, unknown files, unapproved origin, stale publication and oversized body", async () => {
    const auth = { authorization: "Bearer owner" };
    expect(
      (
        await handler(
          request(
            "admin-save",
            { content: {}, gate: { enabled: false }, version: 1 },
            auth,
          ),
        )
      ).status,
    ).toBe(400);
    const g = structuredClone(defaultGift);
    g.hero = {
      id: "fake",
      path: "media/fake.jpg",
      kind: "image",
      mime: "image/jpeg",
      x: 50,
      y: 50,
    };
    expect(
      (
        await handler(
          request(
            "admin-save",
            { content: g, gate: { enabled: false }, version: 1 },
            auth,
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (await handler(request("config", {}, { origin: "https://evil.test" })))
        .status,
    ).toBe(403);
    expect(
      (await handler(request("admin-publish", { version: 0 }, auth))).status,
    ).toBe(409);
    expect(
      (await handler(request("config", { big: "x".repeat(110000) }))).status,
    ).toBe(413);
  });
});
