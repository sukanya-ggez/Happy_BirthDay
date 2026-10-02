// Read-only live verification after setup. No publishing, writes or uploads.
// Set SUPABASE_URL, SUPABASE_ANON_KEY and (optionally) OWNER_ACCESS_TOKEN in your local shell.
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_ANON_KEY;
if (!url || !key)
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_ANON_KEY locally first. Do not put service-role keys in this script.",
  );
const call = async (action, body = {}, extra = {}) =>
  fetch(`${url}/functions/v1/gift-api?action=${action}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
const cfg = await call("config");
if (!cfg.ok)
  throw new Error(`Configuration failed (${cfg.status}): ${await cfg.text()}`);
const gate = await cfg.json();
console.log("Gate enabled:", gate.enabled);
const admin = await call("admin-draft");
if (admin.status !== 401)
  throw new Error("Anonymous admin read must return 401");
console.log("Anonymous admin blocked");
if (gate.enabled) {
  for (const action of ["content", "asset"]) {
    const r = await call(action, { path: "media/guessed.jpg" });
    if (r.status !== 401) throw new Error(`Gated ${action} must return 401`);
    console.log(`Gated ${action} blocked without session`);
  }
}
const direct = await fetch(`${url}/rest/v1/gift?select=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const text = await direct.text();
if (direct.ok && text !== "[]")
  throw new Error("Anonymous database read returned rows");
console.log("Anonymous direct database read blocked or empty");
const listing = await fetch(`${url}/storage/v1/object/list/gift-media`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prefix: "media", limit: 1 }),
});
const listText = await listing.text();
if (listing.ok && listText !== "[]")
  throw new Error("Anonymous Storage listing returned objects");
console.log("Anonymous private Storage read blocked or empty");
if (process.env.OWNER_ACCESS_TOKEN) {
  const r = await call(
    "admin-draft",
    {},
    { Authorization: `Bearer ${process.env.OWNER_ACCESS_TOKEN}` },
  );
  if (!r.ok) throw new Error("Owner token cannot read draft");
  console.log("Owner draft read works; content intentionally not printed");
}
console.log(
  "Read-only checks passed. Still test valid/wrong recipient codes, uploads, publish, and media on the real service manually.",
);
