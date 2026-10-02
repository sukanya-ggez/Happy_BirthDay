// Frontend integration test with mocked Supabase transport; not a live deployment check.
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultGift } from '../supabase/functions/_shared/model.ts';
import { linuxChromium } from './test-chromium.mjs';

process.env.VITE_APP_MODE = 'online';
process.env.VITE_SUPABASE_URL = 'https://test-birthday.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'public-test-key';
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, base: '/' });
await server.listen();
const base = server.resolvedUrls.local[0];
const output = path.resolve('test-results/online');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(await linuxChromium(path.resolve('test-results')));
const errors = [];
const initial = structuredClone(defaultGift);
initial.wish = 'PUBLISHED BEFORE MIGRATION';
let draft = structuredClone(initial), published = structuredClone(initial), version = 0;
const photo = await fs.readFile('public/bouquet.webp');
const media = { id: 'old', path: 'media/old.webp', kind: 'image', mime: 'image/webp', x: 72, y: 34 };
const content = { ...structuredClone(initial), recipient: 'Import test', wish: 'IMPORTED PRIVATE DRAFT', hero: media };
const backup = { format: 'happy-birthday-backup-v1', draft: { content }, files: { [media.path]: `data:image/webp;base64,${photo.toString('base64')}` } };
const draftResponse = () => ({ content: draft, version, gate: { enabled: false, hasCode: false }, publishedAt: null });
const ownerToken = 'mock-owner-token';
async function context() {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await c.route('https://test-birthday.supabase.co/**', async (route) => {
    const req = route.request(), url = new URL(req.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
    if (req.method() === 'OPTIONS') return send({});
    if (url.pathname.includes('/auth/v1/token')) return send({ access_token: ownerToken, refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600, user: { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.test' } });
    const action = url.searchParams.get('action');
    if (action?.startsWith('admin-') && req.headers().authorization !== `Bearer ${ownerToken}`) return send({ error: 'not logged in' }, 401);
    if (action === 'config') return send({ enabled: false });
    if (action === 'content') return send(published);
    if (action === 'asset' || action === 'admin-asset') return route.fulfill({ headers, contentType: 'image/webp', body: photo });
    if (action === 'admin-draft') return send(draftResponse());
    if (action === 'admin-upload') return send({ ...media, id: 'uploaded', path: 'media/uploaded.webp', x: 50, y: 50 });
    if (action === 'admin-save') {
      const data = req.postDataJSON();
      if (data.version !== version) return send({ error: 'stale draft' }, 409);
      draft = structuredClone(data.content); version++;
      return send(draftResponse());
    }
    if (action === 'admin-publish') {
      const data = req.postDataJSON();
      if (data.version !== version) return send({ error: 'stale draft' }, 409);
      published = structuredClone(draft); version++;
      return send(draftResponse());
    }
    return send({ error: 'unknown route' }, 404);
  });
  return c;
}
try {
  const owner = await context(), guestA = await context(), guestB = await context();
  const a = await owner.newPage(), p = await guestA.newPage(), q = await guestB.newPage();
  for (const page of [a, p, q]) page.on('pageerror', (e) => errors.push(e.message));
  const open = async (page) => {
    await page.goto(base);
    await page.getByRole('button', { name: 'แตะเปิดซองจดหมาย' }).click({ force: true, noWaitAfter: true });
    await expect(page.locator('.birthday-wish')).toHaveText(initial.wish);
  };
  await open(p); await open(q);
  await a.goto(base + 'admin/');
  await a.getByLabel('อีเมลเจ้าของ').fill('owner@example.test');
  await a.getByLabel('รหัสผ่านเจ้าของ').fill('test-owner-password');
  await a.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click({ force: true, noWaitAfter: true });
  await expect(a.getByRole('heading', { name: 'ข้อความและวันเกิด' })).toBeVisible();
  await a.getByRole('button', { name: 'การเข้าถึงและสำรอง', exact: true }).click({ force: true, noWaitAfter: true });
  const input = a.getByLabel('นำเข้าไฟล์สำรอง JSON');
  const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) };
  await input.setInputFiles(file);
  await a.getByRole('button', { name: 'ยกเลิก', exact: true }).click({ force: true, noWaitAfter: true });
  expect(version).toBe(0);
  await input.setInputFiles(file);
  await a.getByRole('button', { name: 'ยืนยัน', exact: true }).click({ force: true, noWaitAfter: true });
  await expect(a.locator('.notice.success')).toContainText('นำเข้าสำรองและบันทึกฉบับร่างแล้ว');
  expect(draft.hero).toMatchObject({ path: 'media/uploaded.webp', x: 72, y: 34 });
  expect(published.wish).toBe(initial.wish);
  await expect(p.locator('.birthday-wish')).toHaveText(initial.wish);
  await expect(q.locator('.birthday-wish')).toHaveText(initial.wish);
  await a.getByRole('button', { name: 'เผยแพร่เนื้อหา', exact: true }).click({ force: true, noWaitAfter: true });
  await a.getByRole('button', { name: 'ยืนยัน', exact: true }).click({ force: true, noWaitAfter: true });
  await expect(a.locator('.notice.success')).toContainText('เผยแพร่เนื้อหาออนไลน์แล้ว');
  await expect(p.locator('.birthday-wish')).toHaveText(content.wish, { timeout: 12000 });
  await expect(q.locator('.birthday-wish')).toHaveText(content.wish, { timeout: 12000 });
  await a.screenshot({ path: path.join(output, 'import-admin.png'), fullPage: true });
  expect(errors).toEqual([]);
  console.log('PASS online owner login, restore confirmation, shared media upload, private draft, and automatic publication updates in two independent guest browsers (mocked Supabase).');
} finally {
  await browser.close(); await server.close();
}
