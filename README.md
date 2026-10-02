# Happy Birthday · A little love

เว็บไซต์ของขวัญวันเกิดสำหรับแฟนสาว React + TypeScript + Vite พร้อมหน้า `/admin` และ Supabase Edge Function สำหรับโหมดออนไลน์ **ยังไม่ได้เผยแพร่เว็บไซต์หรือเชื่อม Supabase จริง**

ข้อมูลเริ่มต้น: Happy 19th Birthday, วันเกิด 3 October 2007, วันฉลอง 3 October 2026 และข้อความบนซอง “ถึงคนโปรดของเค้า” ชื่อผู้รับ/ผู้ส่งเว้นว่าง รูปจริงยังไม่มี เพลงเริ่มต้น 3 ช่อง และรูปเริ่มต้น 8 ช่อง จดหมายมีข้อความตัวอย่างในวงเล็บเพื่อให้แก้เอง ไม่มีชื่อหรือความทรงจำที่แต่งขึ้น

## เปิดใน VS Code

ต้องมี Node.js 22.12+ (แนะนำ Node.js 24 LTS) และ npm

1. แตก ZIP แล้วเปิดโฟลเดอร์ `happy-birthday` ใน VS Code
2. เปิด Terminal → New Terminal
3. รัน:

```bash
npm ci
npm run dev
```

เปิด URL ที่ Terminal แสดง ปกติคือ `http://localhost:5173` หน้าจัดการคือ `http://localhost:5173/admin` ไม่ควรเปิด `index.html` ด้วยการดับเบิลคลิก เพราะต้องใช้ dev server

ไม่ต้องมี `.env` ก็ใช้ Demo ได้ ถ้าต้องการตั้งค่า ให้คัดลอก `.env.example` เป็น `.env` โดยตั้ง `VITE_APP_MODE=demo`

ใน `/admin` ครั้งแรกให้ตั้งอีเมลและรหัสผ่าน **เจ้าของ Demo** อย่างน้อย 8 ตัวอักษรด้วยตัวเอง ไม่มีบัญชีหรือรหัสเริ่มต้นที่ฝังในเว็บ บัญชีนี้ใช้ได้เฉพาะเบราว์เซอร์และ origin เดิม โหลดหน้าใหม่ใน Demo แล้วต้องเข้าสู่ระบบอีกครั้ง

## สิ่งที่ทำได้

- เปิดซองพร้อมฝาซอง/จดหมายเลื่อนและดอกไม้ ปุ่มข้าม และลดภาพเคลื่อนไหวตามการตั้งค่าอุปกรณ์
- เซอร์ไพรส์วันเกิด แยกวันเกิดกับวันฉลองชัดเจน เป่าเทียนด้วยปุ่ม และเล่นใหม่
- อัลบั้มรูปเดี่ยว/รูปคู่ คำบรรยาย lightbox ดูรูปก่อนหน้า/ถัดไป ปิดด้วย Escape และคืน focus
- เครื่องเล่นเทป เล่นเสียงหลังแตะเท่านั้น รองรับ YouTube IFrame API และไฟล์ MP3/WAV/OGG/M4A ม้วนเทปหมุนเมื่อ media event รายงานว่ากำลังเล่นจริง มีเล่น/หยุด ระดับเสียง ปิดเสียง และช่องวิดีโอที่เปิดเต็มจอได้เมื่ออุปกรณ์รองรับ
- เปลี่ยนหน้าแล้วเครื่องเล่นเก่าถูกทำลายหรือหยุด ไม่มีเพลงพื้นหลังอีกชุด
- จดหมายหลายย่อหน้า ลายมือสำหรับหัวข้ออังกฤษ และฟอนต์ไทยสำหรับเนื้อหา (ไฟล์ฟอนต์อยู่ใน build ไม่ต้องโหลด Google Fonts)
- หน้าเจ้าของแก้ข้อมูล เพิ่ม/เปลี่ยน/ลบ/เรียงรูปและเพลง เลือกส่วนครอป ปรับสี พื้นหลัง เสียงประกอบ และรหัสผู้รับ
- บันทึกฉบับร่าง ดูตัวอย่าง และเผยแพร่เป็นคนละขั้นตอน การแก้ไขร่างไม่กระทบฉบับเผยแพร่
- แจ้งข้อมูลยังไม่บันทึก ยืนยันก่อนลบหรือออกจากหน้าจัดการ ตรวจข้อมูลก่อนบันทึก และแสดงสถานะ/ข้อผิดพลาด

## เตรียมของขวัญผ่านหน้าจัดการ

1. เข้า `/admin` แล้วเข้าสู่ระบบเจ้าของ
2. “ข้อความและวันเกิด”: เติมชื่อผู้รับ/ผู้ส่ง อายุ วันที่ ข้อความบนซอง คำอวยพร และจดหมาย เว้นบรรทัดว่างเพื่อแบ่งย่อหน้า
3. “รูปและอัลบั้ม”: อัปโหลด JPG/PNG/WebP ไม่เกิน 8 MB เลือกตำแหน่งแนวนอน/แนวตั้งในตัวอย่างครอปแล้วกด “ใช้ตำแหน่งนี้” รูปเต็มไม่ถูกครอปทิ้ง ภาพจะถูกปรับขนาดด้านยาวไม่เกิน 1800 px และแปลง WebP เพื่อให้มือถือโหลดเร็ว เพิ่มคำบรรยาย เลือกรูปเดี่ยว/คู่ และเลื่อนขึ้นลง (สูงสุด 30 รูป)
4. “เพลงของเธอ”: ใส่ชื่อเพลง ศิลปิน และลิงก์ HTTPS ของ YouTube หรืออัปโหลดไฟล์เสียงที่มีสิทธิ์ใช้ ไม่เกิน 20 MB (สูงสุด 15 เพลง) ไม่รับ URL ไฟล์เสียงจากเว็บไซต์อื่นเพราะไม่สามารถรับรองสิทธิ์เข้าถึงไฟล์เหล่านั้นได้
5. “สีและบรรยากาศ”: เลือกสี กระดาษ/พื้นเรียบ และเสียงประกอบ เสียงประกอบเป็นโน้ตสั้นที่สร้างด้วย Web Audio หลังการแตะ ไม่ต้องใช้ไมโครโฟน
6. “การเข้าถึงและสำรอง”: เปิดใช้รหัสผู้รับและตั้งรหัสใหม่ เว้นว่างเพื่อคงรหัสเดิม รหัสไม่ใช่รหัสบัญชีผู้ดูแล โหมดออนไลน์รับรหัสอย่างน้อย 4 ตัวอักษรและไม่เกิน 72 ไบต์ UTF-8 (ข้อจำกัด bcrypt; ภาษาไทยใช้หลายไบต์ต่ออักษร)
7. กด “ดูตัวอย่าง” ตรวจร่าง จากนั้น “บันทึกฉบับร่าง” แล้ว “เผยแพร่เนื้อหา” หากยังไม่บันทึก ปุ่มเผยแพร่จะบันทึกก่อนและแจ้งข้อผิดพลาดถ้าข้อมูลไม่ผ่าน
8. เปิดหน้า `/` ใหม่เพื่อดูฉบับที่เผยแพร่ ใน Demo ต้องใช้เบราว์เซอร์และ origin เดิม

ลบรูปจากร่างเป็นการลบการอ้างอิงเท่านั้น ไฟล์ไม่ถูกลบจากที่เก็บ จึงไม่ทำให้รูปในฉบับเผยแพร่เสีย ไฟล์ที่เลิกใช้และไฟล์ที่อัปโหลดแล้วกดยกเลิกครอปจะคงอยู่ ยังไม่มีระบบล้างไฟล์อัตโนมัติ

## ข้อจำกัด Demo ที่ต้องเข้าใจ

Demo ใช้ IndexedDB ในเครื่องสำหรับข้อมูลและ Blob ไฟล์ **ไม่ใช่การบันทึกออนไลน์** ผู้เปิดลิงก์จากโทรศัพท์/คอมเครื่องอื่น หรือเปิดคนละเบราว์เซอร์ จะไม่ได้รับข้อความหรือรูปที่คุณแก้ ถ้าเปลี่ยน port หรือ origin ก็ใช้พื้นที่บันทึกคนละชุด

บัญชีเจ้าของ Demo และรหัสผู้รับใช้ทดสอบขั้นตอนเท่านั้น ผู้ที่ควบคุมเครื่อง/DevTools สามารถตรวจหรือแก้ข้อมูลใน IndexedDB ได้ จึงห้ามถือเป็นระบบป้องกันข้อมูลส่วนตัวจริง ไม่ใช้ service role ใน frontend และไม่มีรหัสจริงฝังใน bundle แต่ข้อมูล Demo ไม่ใช่ข้อมูลที่รักษาความลับจากผู้ใช้เครื่อง

การล้าง site data/ใช้โหมดไม่ระบุตัวตน/พื้นที่อุปกรณ์เต็มอาจทำให้ข้อมูลหายหรือบันทึกไม่ได้ ต้องสำรองก่อนล้างข้อมูล

## เชื่อม Supabase (ทำเมื่อพร้อม ไม่จำเป็นสำหรับ Demo)

### 1. สร้างฐานข้อมูลและบัญชีเจ้าของ

- สร้างโปรเจกต์ใน Supabase Dashboard
- เปิด SQL Editor แล้วรันทั้งไฟล์ `supabase/migrations/202610020001_gift.sql` **ครั้งเดียวในโปรเจกต์ใหม่** หรือใช้ Supabase CLI migration workflow ในขั้นถัดไป อย่ารันซ้ำด้วยทั้งสองวิธีในฐานเดียว
- ใน Authentication → Users → Add user สร้างอีเมล/รหัสผ่านของเจ้าของและยืนยันอีเมลตามการตั้งค่าบัญชี คัดลอก UUID ของ user
- เพิ่ม UUID ด้วย SQL (ใส่ค่า UUID ของจริงในเครื่อง ไม่ใช่ใน source):

```sql
insert into public.gift_admins(user_id) values ('UUID-ของเจ้าของ');
```

หน้าเว็บไม่มีปุ่มสมัครสมาชิก และ user ที่อยู่ใน Auth อย่างเดียวจะไม่ได้สิทธิ์ admin ต้องอยู่ใน allowlist `gift_admins` ด้วย ปิด Allow new users to sign up ใน Auth settings หากไม่ใช้การสมัครสมาชิกอื่น

Migration สร้าง bucket `gift-media` แบบ **private** อย่าเปลี่ยนให้ public ไม่มีนโยบายอ่านสำหรับ anon และไม่มีนโยบายเขียนจาก browser แม้เจ้าของ การเขียน/อัปโหลดไปผ่าน API ตรวจสิทธิ์เท่านั้น

### 2. ตั้ง frontend

คัดลอก `.env.example` เป็น `.env` และเติม:

```dotenv
VITE_APP_MODE=online
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

ค่า URL และ anon/publishable key เป็นค่าฝั่งสาธารณะ ใช้ค่าจาก Project Settings → API เท่านั้น **ห้ามใส่ service-role key, secret key หรือ RATE_LIMIT_SECRET ใน VITE\_ ทุกกรณี** Restart `npm run dev` หลังเปลี่ยน env

ไม่ควรสลับไป Demo เงียบ ๆ เมื่อออนไลน์ผิดพลาด เว็บจะแสดงข้อผิดพลาดและบอกค่าที่ขาดเพื่อป้องกันการเข้าใจว่าบันทึกออนไลน์แล้ว

### 3. ตั้งและติดตั้ง Edge Function

การ deploy Edge Function ด้านล่างเป็นขั้นตอนเชื่อมบริการเมื่อเจ้าของพร้อม ไม่ได้หมายถึง publish เว็บไซต์ frontend และ **ยังไม่ได้รันให้ในงานส่งมอบนี้**

ใช้ Supabase CLI ผ่าน npm ตามเอกสารทางการ เช่น `npx supabase` (ไม่ใช้ `npm install -g supabase`)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
# ถ้ารัน migration ด้วย CLI ให้ใช้ db push แทน SQL Editor
npx supabase db push
```

คัดลอก `supabase/.env.example` เป็น `supabase/.env` ใส่ `ALLOWED_ORIGINS` เป็น origin ที่เปิดเว็บจริง เช่น `http://localhost:5173,http://localhost:4173` ไม่มี / ท้าย URL แล้วสร้าง `RATE_LIMIT_SECRET` สุ่มอย่างน้อย 32 ตัวอักษรเอง เช่นใช้ `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` ในเครื่อง

```bash
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy gift-api --no-verify-jwt
```

Supabase ใส่ `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ให้ Edge Runtime อยู่แล้ว ไม่ต้องส่งให้ frontend อย่า commit `.env` ของจริง

`verify_jwt=false` จำเป็นเพราะมี config/unlock สำหรับผู้รับที่ไม่มีบัญชี Supabase Handler ตรวจ admin JWT ผ่าน `auth.getUser(token)` และตรวจ allowlist เองทุกครั้งก่อนงานผู้ดูแล ไม่ใช้ anon key เป็นหลักฐานสิทธิ์

เมื่อระบบครบ เปิด `/admin` ลงชื่อเข้าใช้บัญชีจริง เพิ่มข้อมูลใหม่และเผยแพร่ ข้อมูล Demo ไม่ถูกโอนเข้าฐานออนไลน์อัตโนมัติ

### การรักษาสิทธิ์และรหัสในโหมดออนไลน์

- ผู้รับเรียกผ่าน Edge API เท่านั้น ตารางข้อมูลและ Storage ไม่เปิด anon read
- `config` คืนแค่เปิดใช้รหัสหรือไม่ ไม่มีชื่อ รูป หรือจดหมาย
- ตรวจรหัสด้วย bcrypt ฝั่ง PostgreSQL ผ่าน RPC ที่อนุญาตเฉพาะ service role
- จำกัดการลอง 5 ครั้งต่อ IP fingerprint / 15 นาที และ 100 ครั้งรวม / 15 นาที ข้อมูล limit อยู่ฐานเดียวจึงใช้กับหลาย Edge instances ได้ global limit ยังจำกัดได้เมื่อ header IP ไม่น่าเชื่อถือ ต้องตรวจ header IP กับ proxy ของ production ก่อนเปิดใช้งานจริง
- สร้าง token สุ่ม 256-bit เก็บ hash เท่านั้นในฐาน session อายุ 2 ชั่วโมง ผูก revision ที่เผยแพร่ Token ฝั่งผู้รับอยู่ **ในหน่วยความจำ** เท่านั้น ไม่ใส่ URL หรือ localStorage ส่งด้วย `X-Gift-Session` ผ่าน HTTPS โหลดหน้าใหม่ต้องใส่รหัสอีกครั้ง นี่เป็น bearer session ไม่ใช่ HttpOnly cookie
- API `content` และ `asset` ตรวจ session ก่อนอ่านข้อความ/ไฟล์ที่ป้องกันไว้ และอ่านเฉพาะฉบับเผยแพร่ ไฟล์ร่างที่เดา path ได้ก็อ่านไม่ได้ ไม่มี public/signed URL ที่หลุดข้าม session
- เมื่อเผยแพร่ จะเปลี่ยนเนื้อหา+gate พร้อมกันใน transaction เพิ่ม revision และลบ session เดิม ป้องกันฉบับร่างรั่วจากการแก้ไข
- ตรวจชนิด ขนาด และ magic bytes ของไฟล์ใน Edge จำกัด request body ก่อน parse ไม่รับ SVG/HTML path สุ่มและไม่ overwrite ไฟล์เดิม
- เนื้อหาใน React แสดงเป็นข้อความ ไม่มี dangerouslySetInnerHTML
- Session ผู้ดูแลเป็น Supabase Auth มาตรฐานที่ SDK ดูแล การจำ session ในเบราว์เซอร์ใช้สำหรับเจ้าของเท่านั้น

สิ่งที่ผู้รับเปิดอ่าน/ดาวน์โหลดไปแล้วไม่สามารถเรียกคืนจากอุปกรณ์ได้ การตั้งรหัสภายหลังไม่ได้ลบสำเนาที่ผู้รับเคยเห็น

## สำรองข้อมูลและกู้คืน

### สำเนาเนื้อหาพร้อมรูป/เพลง

ในหน้าจัดการ → การเข้าถึงและสำรอง → “ดาวน์โหลดสำรองฉบับร่าง” จะได้ JSON ของ **ฉบับร่างที่บันทึกแล้ว** พร้อมไฟล์รูป/เสียงในรูปแบบ data URL รหัสผู้รับและบัญชีไม่รวมอยู่ด้วย การแก้ไขที่ยังไม่บันทึกไม่รวมอยู่ในสำรอง

ใช้สคริปต์แยกไฟล์นี้ได้ (ต้องมี Python 3):

```bash
python scripts/extract-backup.py happy-birthday-backup.json recovered
```

เปิด `recovered/content.json` เพื่อดูข้อความ และโฟลเดอร์ `recovered/media` เพื่ออัปโหลดไฟล์กลับผ่าน `/admin` ตั้งรหัสใหม่ด้วยตัวเอง ตอนนี้ยังไม่มีปุ่ม import/restore ในหน้าเว็บ สำเนาไฟล์นี้ไม่ใช่ backup ฐาน Supabase ทั้งหมด และไม่เก็บรูปที่มีเฉพาะในฉบับเผยแพร่

### สำรองระบบออนไลน์ทั้งฉบับร่างและเผยแพร่

ก่อนเปลี่ยนระบบใหญ่ ให้สำรองฐานข้อมูลผ่าน Supabase Dashboard Backups/CLI ตามแพ็กเกจของคุณ และ export bucket `gift-media` แบบ private แยกต่างหาก **database backup ไม่ได้เก็บ bytes ใน Storage** เก็บ `.env` และความลับใน password manager แยกจากไฟล์ source ตัวอย่าง CLI สำหรับ data ของแอปหลัง link:

```bash
npx supabase db dump --data-only --schema public --file birthday-data.sql
```

ไฟล์นี้อาจมี password hashes และสมาชิก admin ต้องเก็บเป็นส่วนตัว ใช้ SQL migrations คู่กับ data dump ในการกู้คืนโปรเจกต์ใหม่ สร้างบัญชี Auth ที่ถูกต้องก่อนกู้คืน allowlist/FK และสำรอง Auth ตามเอกสาร Supabase ด้วย UUID อาจเปลี่ยนเมื่อสร้างบัญชีใหม่ จึงต้องปรับ `gift_admins`/`gift_assets.uploaded_by` หลังตรวจเจ้าของจริง

ใช้ Dashboard/S3-compatible API ของ Supabase เพื่อสำรองและกู้คืน Storage โดยคง path ทุกไฟล์ใน `gift-media` อย่ากู้คืน session เดิม ให้ล้าง `gift_sessions` หลัง restore แล้วทดลองรหัสใหม่ ข้อมูล attempt/session ไม่ใช่เนื้อหาที่ต้องเก็บระยะยาว

## ตรวจสอบงาน

```bash
npm run build
npm test
npm run check:edge
# Automated browser checks on production build:
npm run test:browser
```

Browser test ใช้ Chromium: Linux ใช้แพ็กเกจ @sparticuz/chromium สำหรับ environment นี้; Windows/macOS ให้ติดตั้ง `npx playwright install chromium` ก่อน Script รัน static test server ชั่วคราวและปิดเมื่อเสร็จ ไม่เผยแพร่เว็บไซต์

ผลตรวจชุดส่งมอบวันที่ 2 ตุลาคม 2026: build และ TypeScript ฝั่ง Edge ผ่าน, 22 unit/database/API tests ผ่าน และ 13 browser scenarios ผ่าน ไม่มี uncaught errors ใน Chromium (1440 px และ 390 px) รายละเอียดอยู่ `verification.json`

ชุดทดสอบครอบคลุม validation, Demo สิทธิ์และฉบับร่าง, SQL migration/RLS/bcrypt/atomic publication/rate limit ใน PostgreSQL แบบ local (PGlite), และขั้นตอนใช้งานจริงใน Chromium ภาพผลตรวจอยู่ `test-results/` ซึ่งไม่รวมใน source หลัก

**ข้อจำกัดการตรวจ:** ไม่ได้มีโปรเจกต์ Supabase จริง จึงยังไม่ได้ทดสอบ Auth/Storage/Edge deployment ผ่านเครือข่ายจริง YouTube ต้องใช้อินเทอร์เน็ตและวิดีโอที่อนุญาตฝัง ยังไม่มีเพลงจริง จึงมีการทดสอบสถานะ IFrame API ด้วยตัวจำลองแทนการอ้างว่าเล่นเพลงจริงจาก YouTube ผ่านแล้ว ส่วนไฟล์เสียงทดสอบด้วย WAV สังเคราะห์ใน browser test ไม่ใส่ในของขวัญเริ่มต้น

## เมื่อพบข้อผิดพลาด

| ข้อความ/อาการ                       | วิธีแก้                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| ตั้งค่าออนไลน์ไม่ครบ                | เติม URL และ public anon/publishable key ใน `.env` แล้ว restart        |
| ไม่อนุญาตเว็บไซต์ต้นทาง             | เพิ่ม origin ที่ถูกต้องใน ALLOWED_ORIGINS ของ Edge                     |
| ตั้งค่า Edge ไม่ครบ                 | ตั้ง RATE_LIMIT_SECRET ≥32 ตัวอักษรและ ALLOWED_ORIGINS                 |
| ยังไม่มีฐานข้อมูลของขวัญ            | รัน migration ทั้งไฟล์ในโปรเจกต์ใหม่                                   |
| บัญชีไม่มีสิทธิ์เจ้าของ             | ใส่ UUID จาก Auth ใน gift_admins                                       |
| Session ผู้รับหมดอายุ               | โหลดเว็บใหม่ ใส่รหัสอีกครั้ง                                           |
| ลองรหัสบ่อยเกินไป                   | รอ 15 นาที limit นับความพยายามทุกครั้ง                                 |
| ฉบับร่างเปลี่ยนจากอีกหน้าต่าง       | เก็บข้อความที่ยังแก้ไว้ก่อน โหลด admin ใหม่ แล้วแก้จาก revision ล่าสุด |
| รูปไม่มี/อัปโหลดล้มเหลว             | ตรวจชนิด/ขนาด bucket private migrations และการเชื่อมต่อ                |
| YouTube ฝังไม่ได้/ไม่มีอินเทอร์เน็ต | ใช้ปุ่มเปิดบน YouTube หรือเปลี่ยนเพลงใน admin                          |
| Demo อีกเครื่องไม่เห็นข้อมูล        | เป็นพฤติกรรม Demo ต้องเชื่อมออนไลน์และเผยแพร่เนื้อหา                   |

## โครงสร้าง source

- `src/components/GiftStory.tsx` ลำดับของขวัญ และ `MusicPlayer.tsx` ตัวเล่นเดียวต่อหน้า
- `src/components/Admin.tsx` ตัวแก้ไข และ `Modal.tsx` dialog/focus
- `src/lib/demo.ts` IndexedDB, `service.ts` สลับ Demo/ออนไลน์
- `shared/model.ts` ส่งต่อแบบข้อมูล/validation จาก `supabase/functions/_shared/model.ts` ที่ frontend และ Edge ใช้ร่วมกัน
- `supabase/functions/gift-api/index.ts` API ตรวจสิทธิ์ session/ไฟล์
- `supabase/migrations/` schema, RPC, RLS, private Storage
- `.env.example` / `supabase/.env.example` ค่าตัวอย่างที่ไม่มีความลับ

ภาพดอกไม้ตกแต่ง `public/bouquet.webp` สร้างด้วย imagegen แบบโปร่งใส: กุหลาบ blush pink ดอกไม้ครีม ใบ sage และโบว์ dusty rose สีน้ำวินเทจ ไม่มีบุคคลหรือข้อความ ใช้เป็นภาพประดับ ไม่แทนรูปของแฟน

## เอกสารทางการที่ตรวจประกอบการเขียน

- https://react.dev/reference/react/useEffect
- https://vite.dev/guide/ และ https://vite.dev/guide/build
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/reference/javascript/storage-from-upload
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/functions/auth
- https://developers.google.com/youtube/iframe_api_reference
- https://www.postgresql.org/docs/18/pgcrypto.html
- https://vitest.dev/guide/
- https://pglite.dev/extensions/ และ https://pglite.dev/docs/api
- https://playwright.dev/docs/next/library

หลังเชื่อมบริการจริง สามารถใช้ `scripts/verify-supabase.mjs` ตรวจสิทธิ์แบบอ่านอย่างเดียว โดยตั้ง `SUPABASE_URL` และ public `SUPABASE_ANON_KEY` ใน shell ของเครื่องก่อนแล้วรัน `node scripts/verify-supabase.mjs` สคริปต์ไม่เขียน/เผยแพร่เนื้อหา ต้องทดลองอัปโหลด บันทึก เผยแพร่ และเปิดรหัสที่ถูกต้องด้วยบัญชีจริงเพิ่มเติม
