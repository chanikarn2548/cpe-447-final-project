# 🐾 Pawtal (พอลทัล) — ระบบ AI ค้นหาและตรวจจับสัตว์เลี้ยงหาย 5 ชนิด

เว็บแอปพลิเคชันค้นหาสัตว์เลี้ยงหาย–พบด้วยภาพถ่ายและ AI รองรับ **5 ชนิดสัตว์เลี้ยง** (แมว, สุนัข, นก, กระต่าย, แฮมสเตอร์) รวมแหล่งประกาศสาธารณะ **12 เว็บไซต์ + 31 กลุ่ม Facebook** ในที่เดียว ทำงานแบบ Local-first บน **Node.js 22+ & SQLite WAL** พร้อมใช้งานในเครื่องและ Deploy ขึ้น Cloud (Dockerfile / Railway)

---

## เริ่มต้นใช้งานทันที

ต้องมี **Node.js 22.13+** (รองรับ `node:sqlite` ในตัว) จากนั้นรันในโฟลเดอร์โปรเจกต์:

```powershell
npm install
npm start
```

เปิดใช้งานได้ทันทีที่ `http://127.0.0.1:4173`:
- **หน้าหลักค้นหาด้วยภาพ & แผนที่:** `/`
- **ห้องตรวจจับ AI 5 ชนิด & เขตเฝ้าระวัง 5 มุม (Pentagon Zone):** `/detect.html`
- **ศูนย์แหล่งประกาศ 12 เว็บ & 31 กลุ่ม Facebook:** `/sources.html`
- **สไลด์นำเสนอโปรเจกต์ (24 หน้า):** `/slides.html`

---

## ความสามารถหลักของระบบ

### 1. ระบบ AI & การค้นหาแบบ Hybrid
- **Object Detection 5 ชนิด (`models/pets5.onnx`):** Fine-tune YOLO11n (`mAP50 = 90.56%`, `mAP50-95 = 72.52%`) + RF-DETR + Solo Fallback (`43/50`, `IoU50 = 100%`) และระบบเฝ้าระวังพื้นที่ 5 มุม (Ray-Casting IN/OUT)
- **จำแนกชนิดและสายพันธุ์ (Residual Bottleneck MLP — Zero Test Leakage):**
  - 5 ชนิดสัตว์เลี้ยง (`species5-v3`): **99.54%** (Top-3: 100%)
  - สายพันธุ์หมา–แมว 37 พันธุ์ (`oxford37-v5`): **96.08%**
  - สายพันธุ์นก 24 ชนิด (`bird24-v2` บน 2,520 ภาพ): **89.17% (Flip-TTA)**, Top-3 **92.08%**
- **Coat Pattern & Color Tagging (`coat-tagging.mjs`):** จำแนกโทนสีและลายขนสำหรับสัตว์พันธุ์ผสมในไทย (`สามสี`, `ส้ม-ขาว`, `ขาว-ดำ ทักซิโด้`, `ลายสลิด`)
- **Hybrid Re-ranking (`hybrid-ranking.mjs`):** ผสานคะแนนความคล้ายภาพ (Fused 512/384-dim) เข้ากับ **ระยะทาง Haversine** (รองรับทั้งชื่อเขต/จังหวัด และพิกัด GPS จริง `lat/lon`) และ **ความสดใหม่ของเวลา**
- **OCR อ่านเบอร์โทร / ป้ายปลอกคอ / พื้นที่ (`ocr-extract.mjs`):** ใช้ `tesseract.js` (ไทย+อังกฤษ) สกัดเบอร์โทร, `LINE ID`, และพื้นที่จากภาพประกาศลงฟอร์มและฐานข้อมูลเพื่อค้นหาด้วยข้อความ

### 2. ประสบการณ์ใช้งานและชุมชน (UX & Community)
- **รวม 12 เว็บประกาศสาธารณะ + 31 กลุ่ม Facebook:** JS100, FM91, Foundy, iFoundPet, PetFindHome, Kwanma, PetHub Thai, PetFF, Pawsociety, Petio, BirdBack, Pantip (จตุจักร) + แคชเวกเตอร์ถาวรใน SQLite (`embedding_cache`) และ **Background Worker** อุ่นแคชทุก 20 นาที
- **Auto-Poster Generator พร้อม QR Code จริง (`poster-generator.mjs`):** สร้างโปสเตอร์ `1080×1350 px` ด้วย HTML5 Canvas + Pure-JS ISO/IEC 18004 QR Code สแกนเข้า `/?case=<id>` โดยตรง
- **Side-by-Side Zoom (`1x–3x`) & Landmark Pinning:** ซูมและปักหมุดเทียบจุดตำหนิซ้าย–ขวาก่อนเก็บเบาะแส
- **PWA & Mobile Camera + GPS:** รองรับติดตั้งลงหน้าจอมือถือ (`manifest.json` + `sw.js`), ถ่ายรูปจากกล้องทันที (`capture="environment"`), และปุ่มดึงพิกัด GPS จริง
- **LINE Messaging API Bot (`line-bot.mjs`):** พร้อม endpoint `POST /api/line/webhook` (ตรวจลายเซ็น HMAC-SHA256 + ตอบ Flex Card) เมื่อตั้ง `LINE_CHANNEL_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN`

### 3. ความปลอดภัยและการจัดเก็บข้อมูล
- **SQLite 3 WAL (9 ตาราง) + SHA-256 Media Store (`storage.mjs`):** บันทึกถาวรพร้อมลดขนาด `localStorage` อัตโนมัติหลังซิงก์ไฟล์ภาพ
- **Owner PIN 4–6 หลัก (`security.mjs`):** แฮชด้วย salted `scrypt` บังคับตรวจฝั่งเซิร์ฟเวอร์ทั้ง `PATCH /api/cases/:id`, `DELETE /api/cases/:id` และป้องกันการเขียนทับผ่าน `POST /api/database`
- **Rate Limiting, Magic Bytes Validation & Strict Static Allowlist:** กันไฟล์ปลอม (`400`), กันยิงคำขอถี่เกินกำหนด (`429`), บล็อกไฟล์ฐานข้อมูล/หลังบ้าน (`404`), มี `/healthz` และ Graceful Shutdown (`SIGTERM`/`SIGINT`)

---

## การทดสอบและตรวจสอบระบบ (QA)

```powershell
npm test                 # รัน Unit Tests ทั้งหมด (แยก Temp DB อิสระ)
npm run check:release    # รัน Smoke Test เต็มระบบ + ONNX + OCR + Security
```

---

## ตัวแปรสภาพแวดล้อมเสริม (`.env`)
คัดลอก `.env.example` เป็น `.env` (ไม่บังคับ ระบบหลักทำงานได้ทันทีโดยไม่ต้องตั้งค่า):
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `PUBLIC_BASE_URL` — เปิดใช้งาน LINE Bot Webhook (`/api/line/webhook`)
- `META_ACCESS_TOKEN`, `META_PUBLIC_PAGE_IDS` — ค้นเพจ Facebook สาธารณะผ่าน Meta Graph API โดยตรง
- `ADMIN_API_KEY` — ป้องกัน endpoint `POST /api/admin/warm-cache`
- `DATA_DIR` — กำหนดโฟลเดอร์เก็บ SQLite และไฟล์ภาพ (รองรับ `RAILWAY_VOLUME_MOUNT_PATH` อัตโนมัติ)

---

## เอกสารเพิ่มเติมในโปรเจกต์
- สรุปรายละเอียดโปรเจกต์ฉบับเต็ม: [PROJECT_SUMMARY_FULL_TH.md](PROJECT_SUMMARY_FULL_TH.md)
- สคริปต์สาธิตสด 4 นาที & แนวคำตอบกรรมการ Q&A: [DEMO_SCRIPT_QA_TH.md](DEMO_SCRIPT_QA_TH.md)
- เตรียมเปิดเว็บสาธารณะบน Railway: [release/DEPLOY_PUBLIC_TH.md](release/DEPLOY_PUBLIC_TH.md)

> **ข้อจำกัดที่ระบุอย่างตรงไปตรงมา:** คะแนนความคล้ายของภาพจาก AI ใช้เพื่อคัดกรองและจัดอันดับเบาะแสเบื้องต้น (Human-in-the-Loop) ไม่ใช่การยืนยันตัวตนสัตว์ 100% อัตโนมัติ และฟีเจอร์ LINE OA / Meta Graph API ต้องใช้ Token จากผู้ให้บริการภายนอก
