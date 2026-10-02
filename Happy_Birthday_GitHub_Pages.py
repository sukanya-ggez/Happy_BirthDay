#!/usr/bin/env python3
"""Prepare this birthday project for Pages. Never commits, pushes or deploys."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

MARKER = "# Happy Birthday Pages setup v1"
PATHS = '''// Resolve links against Vite's base, including GitHub project Pages.
export function appUrl(relative = ""): string {
  return import.meta.env.BASE_URL + relative.replace(/^\\/+/, "");
}

export function appRoute(): string {
  const base = import.meta.env.BASE_URL.replace(/\\/$/, "");
  const pathname = location.pathname;
  if (base && pathname !== base && !pathname.startsWith(base + "/")) return "";
  return pathname.slice(base.length).replace(/^\\/+|\\/+$/g, "");
}
'''
POSTBUILD = '''// GitHub Pages serves real files rather than a server-side SPA fallback.
// Both URLs load the same app; owner permissions are checked by the service.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
await mkdir("dist/admin", { recursive: true });
await copyFile("dist/index.html", "dist/admin/index.html");
await writeFile("dist/.nojekyll", "");
console.log("Prepared static /admin/ entry for GitHub Pages.");
'''
WORKFLOW = '''# Happy Birthday Pages setup v1
name: Publish Birthday to GitHub Pages

# A push only saves source. Publishing requires the owner's Run workflow click.
on:
  workflow_dispatch:
    inputs:
      app_mode:
        description: "Demo stores data only in this browser; online requires Supabase"
        type: choice
        options:
          - demo
          - online
        default: demo
        required: true

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: birthday-pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    defaults:
      run:
        working-directory: __APP_DIRECTORY__
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7, official Vite guide
      - name: Set up Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: __LOCK_FILE__
      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6
      - name: Install dependencies
        run: npm ci
      - name: Build website
        env:
          APP_BASE_PATH: ${{ steps.pages.outputs.base_path }}/
          VITE_APP_MODE: ${{ inputs.app_mode }}
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
        run: |
          node --input-type=module <<'NODE'
          if (process.env.VITE_APP_MODE === 'online') {
            const url = process.env.VITE_SUPABASE_URL || '';
            const key = process.env.VITE_SUPABASE_ANON_KEY || '';
            let validUrl = false;
            try { validUrl = new URL(url).protocol === 'https:'; } catch {}
            let role = '';
            try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
            const publicKey = key.startsWith('sb_publishable_') || role === 'anon';
            if (!validUrl || !publicKey) {
              console.error('Online requires VITE_SUPABASE_URL and a public anon/publishable key in repository Actions variables. Never use a service-role/secret key.');
              process.exit(1);
            }
          }
          NODE
          npm run build
      - name: Upload site
        uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5
        with:
          path: __DIST_DIRECTORY__
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5
      - name: Show gift and admin links
        env:
          PAGE_URL: ${{ steps.deployment.outputs.page_url }}
          APP_MODE: ${{ inputs.app_mode }}
        run: |
          python3 - <<'PY'
          import os
          base = os.environ['PAGE_URL'].rstrip('/') + '/'
          with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
              summary.write(f"Gift: {base}\\n\\nOwner: {base}admin/\\n\\nMode: {os.environ['APP_MODE']}\\n\\n")
              if os.environ['APP_MODE'] == 'demo':
                  summary.write('Demo data belongs to the current browser and origin only. Other visitors will not see your edited photos, music or text.\\n')
          PY
'''
GUIDE = '''# สร้างลิงก์ถาวรผ่าน GitHub Pages

ไฟล์ตั้งค่านี้ยังไม่เผยแพร่เว็บไซต์ ไม่ได้ push โค้ด และไม่เชื่อม Supabase ให้
การ push บันทึก source เท่านั้น ต้องกด Run workflow เพื่อเผยแพร่แต่ละครั้ง

1. ใน Codespaces เปิด Terminal ที่โฟลเดอร์ repository แล้วรันไฟล์
   `python3 Happy_Birthday_GitHub_Pages.py`
   ถ้ามีหลายโปรเจกต์ ระบุ `--project ชื่อโฟลเดอร์` ให้ตรงกับ package.json ของเว็บ
2. สคริปต์สำรองไฟล์ที่จะปรับก่อนเขียน ตั้งเส้นทางรูป/ลิงก์ให้รองรับชื่อ repository
   เพิ่มหน้า admin/ สำหรับ static hosting และรัน build ตรวจภายในเครื่อง
3. เปิด Source Control ใน VS Code ตรวจรายการ Changes และ diff ของไฟล์
   Stage เฉพาะไฟล์ที่สคริปต์รายงาน จากนั้น Commit และ Push/Sync Changes
   ไม่ควร stage .env, node_modules, dist หรือข้อมูลสำรองส่วนตัว
4. เปิด repository บน github.com → Settings → Pages
   ที่ Build and deployment เลือก Source เป็น GitHub Actions
   ถ้าใช้ GitHub Free, Pages ใช้ได้กับ repository แบบ public ตามเงื่อนไข GitHub
5. เปิดแท็บ Actions → Publish Birthday to GitHub Pages → Run workflow
   เลือก main และ app_mode ให้ตรงกับสถานะการเชื่อมบริการ แล้วกด Run workflow
   ขั้นตอนนี้เป็นการเผยแพร่จริงบนอินเทอร์เน็ต
6. รอทุกขั้นตอนสำเร็จ เปิด Summary ของ workflow เพื่อคัดลอก Gift และ Owner
   หรือใช้ปุ่ม Visit site ใน Settings → Pages ลิงก์ Owner ลงท้าย /admin/

## เลือก Demo หรือ online

**Demo** ทดลองเว็บที่ลิงก์ถาวรได้ แต่ข้อความ รูป เพลง บัญชี Demo และรหัสผู้รับ
ยังอยู่เฉพาะเบราว์เซอร์และ origin นั้น คนอื่นจะเห็นข้อมูลตัวอย่างของตนเอง
ข้อมูลที่เคยแก้บน Codespaces ไม่ถูกย้ายมายัง github.io
ก่อนย้าย URL ให้ดาวน์โหลดสำรองผ่าน admin → การเข้าถึงและสำรอง
ยังไม่มีปุ่มนำเข้า backup อัตโนมัติ ดูวิธีแยกไฟล์ใน README เดิม
บัญชี Demo ไม่ใช่การรักษาความปลอดภัยออนไลน์ ผู้เยี่ยมชมสร้าง Demo ของตัวเองได้
หากต้องการให้แฟนเห็นรูป/ข้อความที่คุณเผยแพร่ ต้องเชื่อม Supabase และใช้ online

**online** ทำขั้นตอน Supabase ใน README เดิมให้ครบก่อน รวม SQL, บัญชีเจ้าของ,
allowlist, private Storage, Edge Function gift-api และการตั้งค่าความลับบน Supabase
จากนั้นที่ GitHub repository → Settings → Secrets and variables → Actions → Variables
สร้าง Repository variables สองรายการ:

- VITE_SUPABASE_URL: URL โปรเจกต์ Supabase แบบ https
- VITE_SUPABASE_ANON_KEY: public anon หรือ publishable key เท่านั้น

ห้ามใช้ service-role key หรือ secret key ใน frontend, VITE_ หรือ repository
ตั้ง ALLOWED_ORIGINS ของ Edge Function ให้มี origin ของ GitHub Pages จริง เช่น
`https://ชื่อบัญชี.github.io` โดยไม่มีชื่อ repository ต่อท้าย
ถ้าใช้ custom domain ให้ใช้ origin ของ domain นั้นตามจริง
เลือก app_mode=online เมื่อกด Run workflow; ถ้าค่าไม่ครบ/ใช้ secret key build จะหยุด
หลัง deploy ให้เข้าหน้า /admin/ ด้วยบัญชี Supabase แล้วบันทึกและเผยแพร่เนื้อหา
การตรวจ build ไม่ยืนยันว่าฐานข้อมูล สิทธิ์ Storage และ Edge Function ออนไลน์ทำงานครบ
ต้องตรวจด้วยสองเบราว์เซอร์ที่ลิงก์จริงก่อนส่งให้ผู้รับ

## หาก build หรือ deployment ไม่สำเร็จ

- เปิด Actions → workflow ที่ล้มเหลว → step สีแดง แล้วอ่านข้อความ error
- ไม่พบ Pages: ตรวจ Settings → Pages → Source = GitHub Actions และสิทธิ์ repository
- npm ci หา package-lock.json ไม่พบ: ต้อง commit lockfile จากโฟลเดอร์เว็บ
- เว็บขาวหรือรูป 404: ตรวจว่า commit ไฟล์ทั้งหมดที่สคริปต์รายงานแล้ว
- เปลี่ยนโฟลเดอร์โปรเจกต์: แก้ defaults.run.working-directory, cache-dependency-path
  และ path ของ Upload site ใน workflow ให้ตรงกัน
- บัญชี Demo หายเมื่อเปลี่ยน URL: เป็นคนละ origin ข้อมูลไม่ได้ย้ายอัตโนมัติ

## สำรองไฟล์โค้ดที่ปรับ

สคริปต์เก็บไฟล์เดิมและรายชื่อไฟล์ใหม่ในโฟลเดอร์สำรองที่ Terminal รายงาน
หากต้องย้อนการปรับ ให้อ่าน manifest.json และคัดลอกไฟล์เดิมกลับตาม path
สคริปต์ไม่ลบไฟล์เดิมหรือข้อมูล IndexedDB ไม่เขียน .env และไม่ทำคำสั่ง git ที่เปลี่ยน repository

อ้างอิงทางการ:
- https://vite.dev/guide/static-deploy#github-pages
- https://vite.dev/guide/build#public-base-path
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
'''


def is_project(folder):
    return all((folder / p).is_file() for p in (
        "package.json", "package-lock.json", "index.html", "src/main.tsx",
        "src/App.tsx", "src/components/Admin.tsx", "src/components/GiftStory.tsx",
        "vite.config.ts"))


def find_project(start):
    if is_project(start):
        return start
    candidates = []
    for current, dirs, files in os.walk(start):
        here = Path(current)
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in
                   ('node_modules', 'dist', 'test-results', 'supabase')]
        if len(here.relative_to(start).parts) >= 3:
            dirs[:] = []
        if "package.json" in files and is_project(here):
            candidates.append(here)
    if len(candidates) != 1:
        raise ValueError("หาโฟลเดอร์เว็บไม่พบหรือพบหลายโฟลเดอร์ ให้ระบุ --project ตามโฟลเดอร์ที่มี src/main.tsx จริง")
    return candidates[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, help="Birthday project directory")
    parser.add_argument("--no-build", action="store_true", help="Write files only; run npm run build yourself")
    args = parser.parse_args()
    project = (args.project.resolve() if args.project else find_project(Path.cwd().resolve()))
    if not is_project(project):
        raise ValueError("โฟลเดอร์นี้ไม่ใช่โปรเจกต์ Happy Birthday ที่มี src/main.tsx ครบ")
    result = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=project,
                            capture_output=True, text=True) if shutil.which("git") else None
    repo = Path(result.stdout.strip()).resolve() if result and result.returncode == 0 else project
    relative = project.relative_to(repo).as_posix()
    if any(c in relative for c in ('\n', '\r', '\x00')):
        raise ValueError("ชื่อโฟลเดอร์ไม่รองรับ")
    changes = {}
    originals = {}

    def edit(file, transform):
        path = project / file
        before = path.read_text(encoding="utf-8")
        after = transform(before)
        if after != before:
            changes[path] = after

    def add(path, content):
        if path.exists() and path.read_text(encoding="utf-8") != content:
            raise ValueError(f"มีไฟล์ {path.relative_to(repo)} ที่เนื้อหาต่างกันอยู่แล้ว หยุดเพื่อรักษางานเดิม")
        if not path.exists():
            changes[path] = content

    def app(source):
        if "appRoute()" in source:
            return source
        old = 'location.pathname.replace(/\\/$/, "") === "/admin"'
        if old not in source:
            raise ValueError("src/App.tsx เปลี่ยนจากต้นฉบับ ไม่สามารถแก้เส้นทางอัตโนมัติได้")
        return 'import { appRoute } from "./lib/paths";\n' + source.replace(
            old, '["admin", "admin/index.html"].includes(appRoute())')

    edit("src/App.tsx", app)
    for file in ("src/components/Admin.tsx", "src/components/GiftStory.tsx"):
        def component(source):
            updated = source.replace('src="/bouquet.webp"', 'src={appUrl("bouquet.webp")}')
            updated = updated.replace('href="/admin"', 'href={appUrl("admin/")}')
            updated = updated.replace('href="/"', 'href={appUrl()}')
            updated = updated.replace('location.href = "/"', 'location.href = appUrl()')
            if updated != source and 'import { appUrl }' not in updated:
                updated = 'import { appUrl } from "../lib/paths";\n' + updated
            return updated
        edit(file, component)

    def vite(source):
        if "process.env.APP_BASE_PATH" in source:
            return source
        if re.search(r'\bbase\s*:', source):
            raise ValueError("vite.config.ts มี base ที่ตั้งเองอยู่แล้ว หยุดเพื่อรักษาการตั้งค่าเดิม")
        token = "defineConfig({"
        if source.count(token) != 1:
            raise ValueError("ไม่พบ defineConfig รูปแบบที่รองรับใน vite.config.ts")
        return source.replace(token, token + '\n  base: process.env.APP_BASE_PATH || "/",', 1)

    edit("vite.config.ts", vite)

    def package(source):
        data = json.loads(source)
        scripts = data.setdefault("scripts", {})
        if "prepare-pages.mjs" not in scripts.get("postbuild", ""):
            scripts["postbuild"] = (scripts.get("postbuild", "") + " && " if scripts.get("postbuild") else "") + "node scripts/prepare-pages.mjs"
        return json.dumps(data, ensure_ascii=False, indent=2) + "\n"

    edit("package.json", package)
    add(project / "src/lib/paths.ts", PATHS)
    add(project / "scripts/prepare-pages.mjs", POSTBUILD)
    add(project / "GITHUB_PAGES_TH.md", GUIDE)
    workflow = WORKFLOW.replace("__APP_DIRECTORY__", json.dumps(relative))
    workflow = workflow.replace("__LOCK_FILE__", json.dumps(str(Path(relative) / "package-lock.json")))
    workflow = workflow.replace("__DIST_DIRECTORY__", json.dumps(str(Path(relative) / "dist")))
    workflow_path = repo / ".github/workflows/birthday-pages.yml"
    if workflow_path.exists() and MARKER not in workflow_path.read_text(encoding="utf-8"):
        raise ValueError("มี workflow ชื่อนี้อยู่แล้ว หยุดเพื่อรักษางานเดิม")
    if not workflow_path.exists() or workflow_path.read_text(encoding="utf-8") != workflow:
        changes[workflow_path] = workflow
    ignore = repo / ".gitignore"
    old_ignore = ignore.read_text(encoding="utf-8") if ignore.exists() else ""
    if ".birthday-pages-backups/" not in old_ignore.splitlines():
        changes[ignore] = old_ignore.rstrip() + "\n.birthday-pages-backups/\n"

    backup = None
    if changes:
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
        backup = repo / ".birthday-pages-backups" / stamp
        backup.mkdir(parents=True)
        manifest = []
        for path in changes:
            rel = path.relative_to(repo)
            existed = path.exists()
            manifest.append({"path": rel.as_posix(), "existed": existed})
            if existed:
                originals[path] = path.read_bytes()
                target = backup / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
        (backup / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            for path, content in changes.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
        except OSError:
            for path in changes:
                if path in originals:
                    path.write_bytes(originals[path])
                elif path.exists():
                    path.unlink()
            raise
    print(f"โฟลเดอร์เว็บ: {project}", flush=True)
    if backup:
        print(f"สำรองไฟล์เดิม: {backup}", flush=True)
    print("ไฟล์ที่ปรับ (ตรวจและ stage ใน Source Control):", flush=True)
    for path in changes:
        print("  " + path.relative_to(repo).as_posix(), flush=True)
    if not changes:
        print("  ตั้งค่าไว้อยู่แล้ว ไม่ต้องเขียนซ้ำ", flush=True)
    if not args.no_build:
        if not shutil.which("npm"):
            raise ValueError("ไม่พบ npm ติดตั้ง Node.js 22.12+ แล้วรัน npm ci และ npm run build ในโฟลเดอร์เว็บ")
        if not (project / "node_modules").is_dir():
            subprocess.run(["npm", "ci"], cwd=project, check=True)
        env = dict(os.environ, APP_BASE_PATH="/birthday-pages-check/")
        subprocess.run(["npm", "run", "build"], cwd=project, env=env, check=True)
        # Leave the ordinary preview usable at / in Codespaces after checking the subpath.
        subprocess.run(["npm", "run", "build"], cwd=project,
                       env=dict(os.environ, APP_BASE_PATH="/"), check=True)
        print("Build ผ่านทั้งเส้นทาง GitHub Pages และเส้นทาง /", flush=True)
    print("ยังไม่ได้ commit / push / เผยแพร่เว็บ", flush=True)
    print("ขั้นต่อไป: Source Control → ตรวจ Changes → Commit → Push", flush=True)
    print("จากนั้น GitHub repository → Settings → Pages → Source: GitHub Actions", flush=True)
    print("เมื่อต้องการเผยแพร่: Actions → Publish Birthday to GitHub Pages → Run workflow", flush=True)
    print("Demo: ข้อมูลอยู่เฉพาะเบราว์เซอร์นี้ คนอื่นไม่เห็นสิ่งที่คุณแก้ ต้องใช้ Supabase online เพื่อแชร์เนื้อหา", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"ไม่สำเร็จ: {error}\nหากเขียนไฟล์แล้วจะมีไฟล์สำรอง อย่า push จนกว่าจะแก้ build ผ่าน", file=sys.stderr)
        sys.exit(1)
