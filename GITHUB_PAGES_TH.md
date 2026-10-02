# สร้างลิงก์ถาวรผ่าน GitHub Pages

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
