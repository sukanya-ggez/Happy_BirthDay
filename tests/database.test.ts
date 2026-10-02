import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import { defaultGift } from "../shared/model";
const db = new PGlite({ extensions: { pgcrypto } });
const owner = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id serial primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 insert into auth.users values('${owner}');`);
  await db.exec(
    fs.readFileSync("supabase/migrations/202610020001_gift.sql", "utf8"),
  );
  await db.exec(
    `insert into public.gift_admins values('${owner}'); grant all on all tables in schema public,storage to anon,authenticated,service_role;`,
  );
}, 30000);
afterAll(() => db.close());
describe("real PostgreSQL migration and policies (local PGlite)", () => {
  it("denies anonymous content, storage, writes, and gate RPC access", async () => {
    await db.exec("set role anon");
    expect((await db.query("select * from public.gift")).rows).toEqual([]);
    expect((await db.query("select * from storage.objects")).rows).toEqual([]);
    await expect(
      db.query("select public.verify_gift_code('1234')"),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.gift_admins values('22222222-2222-4222-8222-222222222222')",
      ),
    ).rejects.toThrow();
    expect(
      (await db.query("update public.gift set draft='{}'::jsonb returning id"))
        .rows,
    ).toEqual([]);
    await db.exec("reset role");
  });
  it("allows owner read but denies direct client mutation", async () => {
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub='${owner}'`,
    );
    expect((await db.query("select id from public.gift")).rows).toHaveLength(1);
    expect(
      (await db.query("update public.gift set draft='{}'::jsonb returning id"))
        .rows,
    ).toEqual([]);
    await expect(db.query("select public.publish_gift(0)")).rejects.toThrow();
    await db.exec("reset role");
  });
  it("unlisted logged-in user cannot read or become owner", async () => {
    await db.exec(
      "set role authenticated; set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'",
    );
    expect((await db.query("select id from public.gift")).rows).toEqual([]);
    await expect(
      db.query(
        "insert into public.gift_admins values('22222222-2222-4222-8222-222222222222')",
      ),
    ).rejects.toThrow();
    await db.exec("reset role");
  });
  it("saves draft privately, rejects stale revision, then atomically publishes gate", async () => {
    const changed = { ...structuredClone(defaultGift), sender: "DRAFT ONLY" };
    const r = await db.query<{ ok: boolean }>(
      "select public.save_gift_draft($1::jsonb,true,$2,0) as ok",
      [JSON.stringify(changed), "test-code"],
    );
    expect(r.rows[0].ok).toBe(true);
    const before = await db.query<{
      draft: any;
      published: any;
      gate_enabled: boolean;
    }>("select draft,published,gate_enabled from public.gift");
    expect(before.rows[0].published.sender).toBe("");
    expect(before.rows[0].draft.sender).toBe("DRAFT ONLY");
    expect(before.rows[0].gate_enabled).toBe(false);
    expect(
      (await db.query<{ ok: boolean }>("select public.publish_gift(0) as ok"))
        .rows[0].ok,
    ).toBe(false);
    await db.exec(
      "insert into public.gift_sessions values('old-session',0,now()+interval '2 hours')",
    );
    expect(
      (await db.query<{ ok: boolean }>("select public.publish_gift(1) as ok"))
        .rows[0].ok,
    ).toBe(true);
    expect((await db.query("select * from public.gift_sessions")).rows).toEqual(
      [],
    );
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.verify_gift_code('test-code') as ok",
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.verify_gift_code('wrong') as ok",
        )
      ).rows[0].ok,
    ).toBe(false);
    const final = await db.query<{
      published: any;
      gate_enabled: boolean;
      code_hash: string;
    }>("select published,gate_enabled,code_hash from public.gift");
    expect(final.rows[0].published.sender).toBe("DRAFT ONLY");
    expect(final.rows[0].gate_enabled).toBe(true);
    expect(final.rows[0].code_hash).not.toBe("test-code");
  });
  it("enforces 5 attempts within window and resets after cooldown", async () => {
    for (let i = 0; i < 5; i++)
      expect(
        (
          await db.query<{ ok: boolean }>(
            "select public.consume_gift_attempt('client',5) as ok",
          )
        ).rows[0].ok,
      ).toBe(true);
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.consume_gift_attempt('client',5) as ok",
        )
      ).rows[0].ok,
    ).toBe(false);
    await db.exec(
      "update public.gift_attempts set window_start=now()-interval '16 minutes'",
    );
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select public.consume_gift_attempt('client',5) as ok",
        )
      ).rows[0].ok,
    ).toBe(true);
  });
});
