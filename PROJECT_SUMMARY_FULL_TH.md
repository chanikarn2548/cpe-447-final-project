# สรุปโปรเจกต์ “Pawtal (พอลทัล)” ฉบับสมบูรณ์แบบละเอียด
**ชื่อแพ็กเกจ:** `tamnong-prototype` (`v0.2.0`)  
**ชื่อระบบ:** Pawtal (พอลทัล) — ประตูเชื่อมเบาะแส พาสัตว์เลี้ยงกลับบ้าน  
**อัปเดตล่าสุด:** 23 พฤศจิกายน 2569 (2026-11-23)  
**ตำแหน่งโฟลเดอร์งาน:** `C:\Users\tanuy\OneDrive\Desktop\งาน\pet_sight\pet_sight`

---

## 1. ภาพรวมและขอบเขตของโปรเจกต์ (Project Overview & Scope)

### แนวคิดและปัญหาที่แก้ไข
1. **ประกาศสัตว์หายกระจัดกระจาย:** ข้อมูลสัตว์เลี้ยงหายและพบสัตว์พลัดหลงกระจายอยู่หลายเว็บไซต์ข่าว มูลนิธิ กระทู้ และกลุ่ม Facebook ทำให้เจ้าของต้องไล่ค้นหาทีละแหล่ง
2. **ภาระการกรอกข้อมูลของผู้พบสัตว์:** ผู้พบสัตว์มักไม่รู้สายพันธุ์หรือชื่อสัตว์ และไม่อยากกรอกแบบฟอร์มยาว
3. **ฉากหลังและมุมกล้องรบกวนการเทียบภาพ:** พื้นห้อง ถนน กรง หรือป้ายข้อความบนภาพถ่ายทำให้การเปรียบเทียบด้วยสีหรือภาพเต็มเฟรมคลาดเคลื่อน

### ขอบเขตที่ระบบทำได้ (In Scope)
- **รองรับสัตว์เลี้ยง 5 ชนิดหลัก:** แมว (`cat`), สุนัข (`dog`), นก (`bird`), กระต่าย (`rabbit`), และแฮมสเตอร์ (`hamster`)
- **ประมวลผลภาพและ AI ในเครื่อง (100% Local Inference บน CPU):**
  - ตรวจสอบคุณภาพภาพถ่าย (ความละเอียด ความสว่าง ความคมชัด)
  - ตรวจจับตำแหน่งและตีกรอบสัตว์ 5 ชนิด (`YOLO11n v4` + `RF-DETR Nano` + Solo Unambiguous Fallback)
  - ระบุชนิดสัตว์อัตโนมัติ 5 ชนิด (`species5-v3`)
  - จำแนกสายพันธุ์สุนัขและแมว 37 สายพันธุ์ (`oxford37-v5`)
  - จำแนกสายพันธุ์นกยอดนิยมและนกเลี้ยงในไทย 24 สายพันธุ์ (`bird24-v2` + Flip-TTA)
  - สกัดเวกเตอร์ผสานหลายสัญญาณ (Multi-Signal Feature Fusion) และจัดอันดับความคล้ายด้วย Cosine Similarity (รองรับภาพ 1–2 มุมแบบ Mean Similarity)
- **รวมศูนย์การค้นหาประกาศสาธารณะและกลุ่มชุมชน:**
  - ดึงและเทียบภาพอัตโนมัติจาก **12 เว็บไซต์สาธารณะ** (รวมโพสต์กลุ่ม Facebook สาธารณะผ่าน Pawsociety, ประกาศนกหายใน BirdBack และกระทู้ห้องจตุจักรใน Pantip) จากฐานข้อมูลช่องทางรวม **19 แหล่ง**
  - เชื่อม **31 กลุ่ม Facebook ในระบบ** พร้อมส่วนแสดงโพสต์กลุ่ม Facebook ที่คล้ายกัน, ปุ่มค้นหาตรงกลุ่มด้วยคำค้นจาก AI และระบบวางรูป `Ctrl+V` จากกลุ่มเพื่อเทียบทันที
- **ห้องตรวจจับสัตว์เลี้ยง 5 ชนิด & เฝ้าระวังพื้นที่ 5 มุม (`/detect.html`):**
  - รองรับภาพนิ่ง วิดีโอ คลิปสาธิต และกล้องสด (Webcam/CCTV)
  - วาดและปรับจุดพื้นที่เฝ้าระวังห้าเหลี่ยม 5 มุม (Ray-Casting Polygon `IN / OUT`) พร้อมเสียงเตือนเมื่อสัตว์ออกนอกเขต
  - โหมดติด Label เพื่อเตรียมข้อมูลสอน AI และปุ่มส่งต่อภาพไปค้นหาใน 12 เว็บได้ในคลิกเดียว
- **ฐานข้อมูลถาวรและการจัดการเคส:**
  - ฐานข้อมูลเชิงสัมพันธ์ **SQLite 3 (WAL Mode) จำนวน 9 ตารางหลัก** + ระบบแยกไฟล์รูปภาพแบบ Content-Addressable Media Store (SHA-256)
  - ระบบลงทะเบียนโปรไฟล์สัตว์เลี้ยงล่วงหน้า, ไทม์ไลน์เบาะแส, แผนที่จุดหาย–พบ (กทม. และจังหวัดทั่วไทย), ระบบแจ้งเตือน + HTTPS Webhook, และ Export/Import สำรองข้อมูล (JSON/CSV)

### สิ่งที่อยู่นอกขอบเขตและข้อจำกัดตามจริง (Out of Scope & Honest Limitations)
- **ไม่ใช่ระบบยืนยันตัวตนสัตว์รายตัว 100% อัตโนมัติ:** คะแนน AI ใช้คัดกรองและจัดอันดับเบาะแสเพื่อให้เจ้าของตรวจสอบจุดสังเกตและพื้นที่จริงประกอบ (เกณฑ์ยืนยันตัวตนระดับภาคสนามยังไม่ผ่านเป้าหมาย)
- **ไม่สแกนกลุ่มปิด Facebook โดยพลการ:** หากยังไม่ได้ตั้งค่า `META_ACCESS_TOKEN` และ `META_PUBLIC_PAGE_IDS` ที่ได้รับอนุมัติจาก Meta ระบบจะไม่ล็อกอินสแกนกลุ่มปิด แต่ใช้วิธีดึงโพสต์กลุ่มสาธารณะผ่าน Pawsociety/Petio + เชื่อมลิงก์ค้นหา 31 กลุ่มและวางภาพเทียบ AI แทน
- **ขอบเขตสายพันธุ์:** จำแนกเฉพาะ 5 ชนิดหลัก, สุนัข–แมว 37 สายพันธุ์บริสุทธิ์ และนก 24 สายพันธุ์ตามชุดฝึก (พันธุ์ผสมหรือนกนอก 24 ชนิดจะจับคู่ไปยังสายพันธุ์ที่ใกล้เคียงที่สุด)
- **ไม่รองรับสัตว์ป่า/สัตว์น้ำ และไม่รวมอุปกรณ์ติดตาม GPS ฮาร์ดแวร์**

---

## 2. สถาปัตยกรรมระบบและเทคโนโลยี (Tech Stack & File Inventory)

### เทคโนโลยีหลัก
- **Runtime:** Node.js `>=22.13.0` (ES Modules `.mjs` + Built-in `node:sqlite`, `node:test`, `node:http`)
- **Production Dependencies (`package.json`):**
  - `onnxruntime-node` (`^1.31.1`) — รันโมเดล ONNX บน CPU ในเครื่อง
  - `sharp` (`^0.35.5`) — ปรับหมุน EXIF, ครอปภาพ, พลิกซ้าย-ขวา (Flip-TTA), สกัดพิกเซล RGB และ 2D Gaussian Coat
  - `cheerio` (`1.0.0`) — พาร์ส HTML จากเว็บไซต์ประกาศสาธารณะ
- **Dev / Training Tools:**
  - `csv-parse`, `hyparquet`, `hyparquet-compressors` (อ่านชุดข้อมูล Parquet/CSV)
  - `PyTorch CPU` (`torch 2.15.0+cpu`, `ultralytics 8.4.214`) ในสภาพแวดล้อม `training-data/backbone-env` สำหรับฝึกโมเดล `YOLO11n` และหัวจำแนก `Residual Bottleneck MLP`
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (ES Modules), ไม่ต้องใช้ Build Step

### โครงสร้างไฟล์หลักของโปรเจกต์
| หมวด | ไฟล์ | หน้าที่หลัก |
| :--- | :--- | :--- |
| **เซิร์ฟเวอร์ & ความปลอดภัย** | `server.mjs` | HTTP Server, REST API ทั้งหมด, ONNX Session Loader, Multi-Signal Fusion, Static File Allowlist & Security Headers |
| **ฐานข้อมูล & แคช** | `storage.mjs` | SQLite WAL 9 ตาราง, Media Store (SHA-256), `embedding_cache` ถาวร, Alerts, Facebook Groups |
| **โมดูล AI กลาง** | `classifier-head.mjs` | ตัวคำนวณและตรวจสอบหัวจำแนกกลาง รองรับทั้ง Linear และ `residual-mlp-v1` (LayerNorm + GELU-tanh + Skip Linear) |
| **ตัวจำแนกและตรวจจับ** | `detection.mjs`, `pet-crop.mjs`, `species-classifier.mjs`, `breed-classifier.mjs`, `image-quality.mjs`, `multi-query.mjs`, `model-file.mjs` | ตรวจจับ 5 ชนิด (`pets5.onnx`), ครอปตัวสัตว์ (`RF-DETR` + `YOLO11n` + Solo Fallback), จำแนกชนิด 5 คลาส, จำแนกสายพันธุ์หมา/แมว/นก, ตรวจคุณภาพภาพ, เฉลี่ยความคล้ายหลายมุม |
| **ดึงแหล่งประกาศ 12 เว็บ** | `search-sources.mjs`, `additional-sources.mjs`, `public-posts.mjs`, `ifoundpet.mjs`, `petfindhome.mjs`, `fb-groups.mjs`, `source-catalog.json` | ตัวดึงข้อมูล 12 เว็บอัตโนมัติ, ตัดซ้ำด้วย Canonical URL, พาร์สลิงก์และสร้างคำค้นกลุ่ม Facebook |
| **หน้าเว็บหลัก** | `index.html`, `app.js`, `matching.js`, `case-data.js`, `case-tools.js`, `case-map.mjs`, `welcome.js`, `styles.css`, `pet-ui.css`, `readable-ui.css` | หน้าหลักค้นหาสัตว์หาย/พบ, แผนที่, ป๊อปอัปผลเทียบ AI + กลุ่ม Facebook, ไทม์ไลน์เบาะแส, โปรไฟล์, แจ้งเตือน, กลุ่ม FB |
| **ห้องตรวจจับ AI 5 ชนิด** | `detect.html`, `detect.js`, `detect.css`, `zone.js` | สตูดิโอตรวจจับ 5 ชนิด 2 แท็บ (ใช้งานจริง / โหมดสอน Label), โซนห้าเหลี่ยม 5 มุม, วิดีโอ/กล้องสด, ส่งต่อค้น 12 เว็บ |
| **หน้าแหล่งประกาศ & สไลด์** | `sources.html`, `sources.js`, `sources.css`, `slides.html` | หน้าแสดงสถานะ 12 เว็บ + ช่องทางเปิดค้นต่อ + 31 กลุ่ม FB และสไลด์นำเสนอโปรเจกต์ 23 หน้า |
| **ตรวจสอบปล่อยระบบ** | `scripts/check-release.mjs` | สคริปต์ Smoke Test อัตโนมัติ (ออฟไลน์ 14 ด่าน / ออนไลน์ 16 ด่าน) สร้างรายงานที่ `release/check-results.json` |
| **ชุดทดสอบอัตโนมัติ** | `tests/*.test.mjs` (20 ไฟล์, 66 เคส) | ยูนิตเทสต์ครอบคลุม AI, แหล่งข่าว, ฐานข้อมูล, แผนที่, แจ้งเตือน, กลุ่ม FB และการจัดการเคส |

---

## 3. ระบบ AI ทั้ง 4 โมเดล, การผสานสัญญาณ และผลวัดประสิทธิภาพ (Before → After)

### 3.1 สถาปัตยกรรมหัวจำแนกรุ่นใหม่ (`residual-mlp-v1`)
แทนที่หัวจำแนกแบบ Linear เดิมด้วย **Residual Bottleneck MLP** ใน `classifier-head.mjs`:
- โครงสร้างต่อ 1 สมาชิก: `Linear(D → H) → LayerNorm(H, eps=1e-5) → GELU(tanh approx) → Linear(H → C) + SkipLinear(D → C)`
- รองรับ Ensemble เฉลี่ย Logits จากหลาย Fold (`5-Fold Stratified Group Bagging`) โดยยังทำงานด้วย pure JavaScript ในระดับ `< 1 ms` ต่อภาพ
- คัดเลือกโมเดลทุกตัวแบบ **Zero Test Leakage** (คัดเลือกเฉพาะบน Validation / 5-Fold Out-of-Fold โดยไม่นำ Test Set มาจูนพารามิเตอร์) และตรวจยืนยันค่า Parity ระหว่าง PyTorch กับ Node.js (`maxDiff < 10⁻⁶`)

### 3.2 ตารางสรุปโมเดลและการเปรียบเทียบก่อน–หลัง (Before → After)

| ระบบ AI | ไฟล์ / โมเดลฐาน | ขนาดไฟล์ | เดิม (Baseline) | ล่าสุด (เวอร์ชันที่ใช้งานจริง) | ผลวัดจริงบนชุด Test ที่แยกอิสระ |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1. ตรวจจับ 5 ชนิด (Object Detection)** | `models/pets5.onnx` (`YOLO11n v4`, `640×640`) | 10.14 MB | Pilot `55.12%` → v3 `89.96%` mAP50 | `YOLO11n v4` (ฝึก 508 ตัวอย่าง / Val 75 / Test 75) | **`mAP50 = 90.56%`**, **`mAP50-95 = 72.52%`**, **`Recall = 87.65%`**<br>(แมว `93.67%`, หมา `91.76%`, นก `90.38%`, กระต่าย `84.78%`, แฮมสเตอร์ `92.18%`) |
| **2. ครอปตัวสัตว์อัตโนมัติ** | `pet-crop.mjs` (`RF-DETR Nano` + `pets5.onnx`) | — | Threshold ตายตัว `0.65` (`41/50`) | เพิ่ม **Solo Unambiguous Fallback** (รับ `0.48+` เฉพาะเมื่อทั้งภาพมีสัตว์ 1 ตัวชัด) | **`43 / 50` ภาพ (`boxesIoU50 = 43/43 = 100%`)** และยังคงปฏิเสธภาพหลายตัว/ต่างชนิด |
| **3. จำแนกชนิดสัตว์ 5 คลาส** | `models/species5-head.json` (`species5-v3`) บน `dinov2-small-q4` (`384-dim`) | 0.92 MB | Linear `v2`: Test `99.08%`, Blur `94.01%` | **Residual MLP** (`h=256`, 1 member, Noise + Mixup) | **Test (217): `99.54%` (216/217, Top-3 `100%`)**, Val (136): `98.53%` (MR `98.67%`), **Blur: `94.47%`**, Crop: `99.54%`, Dark: `99.08%` |
| **4. จำแนกสายพันธุ์หมา–แมว 37 พันธุ์** | `models/breed-head.json` (`oxford37-v5`) บน `pet-recognition-base` (`512-dim`) | 4.02 MB | Linear `v4`: Test `95.54%`, Rem `95.02%`, ValLoss `0.3061` | **5-Fold Residual MLP** (`h=128`, 5 members, No-Mixup, Single-view) | **Test (1,480): `96.08%` (1,422/1,480, Top-3 `98.99%`)**, **Remaining (2,189): `95.43%` (Top-3 `99.22%`)**, 5-Fold OOF: `96.82%`, ValLoss `0.1855` (ลด 39%) *(หมายเหตุ: บน Val ย่อย 185 ภาพ v4 ได้ 95.68% / v5 ได้ 94.59%)* |
| **5. จำแนกสายพันธุ์นก 24 ชนิด** | `models/bird-head.json` (`bird24-v2`) บน `dinov2-small-q4` (`384-dim`) | 3.95 MB | Linear `v1` (792 ภาพฝึก): Test Crop `82.50%`, ValLoss `0.5412` | ขยายชุดภาพ **2,520 ภาพ** (train 2,160 / val 120 / test 240) + **5-Fold Residual MLP** (`h=192`) + **Flip-TTA** | **Test Flip-TTA (240): `89.17%` (`+6.67%`, 214/240)**, Test Crop: `88.33%`, **Top-3: `92.08%`**, Test Full: `85.42%`, 5-Fold OOF: `90.05%`, ValLoss `0.2955` (ลด 45%) *(หมายเหตุ: บน Val ย่อย 120 ภาพ v1 ได้ 94.17% / v2 ได้ 92.50% TTA)* |

*(หมายเหตุ: โมเดล Backbone 2 ตัวที่โหลดแคชไว้ใน `%TEMP%/tamnong-model-cache/` ได้แก่ `pet-recognition-base.onnx` ~348 MB และ `dinov2-small-q4.onnx` ~16.9 MB พร้อม `rfdetr-nano.onnx` สำหรับช่วยครอปภาพ)*

### 3.3 ระบบผสานสัญญาณเพื่อค้นหาภาพคล้าย (`appearanceEmbeddingFromBuffer` ใน `server.mjs`)
- **สำหรับสุนัขและแมว (`512-dim` 4-Signal Fusion):**
  - โครงหน้าและเอกลักษณ์จาก `pet-recognition-base`: **223 มิติ** (น้ำหนัก `35%`, คูณ `√0.35`)
  - โปรไฟล์ความน่าจะเป็น 37 สายพันธุ์จาก `oxford37-v5`: **37 มิติ** (น้ำหนัก `20%`, คูณ `√0.20`)
  - ลวดลายและพื้นผิวขนจาก `dinov2-small-q4`: **156 มิติ** (น้ำหนัก `15%`, คูณ `√0.15`)
  - สีขนกลางลำตัวจาก 2D Gaussian Coat Grid (`coatAppearanceVector`): **96 มิติ** (น้ำหนัก `30%`, คูณ `√0.30`)
- **สำหรับนก (`384-dim` 3-Signal Fusion):**
  - `dinov2-small-q4`: **264 มิติ** (น้ำหนัก `45%`) + โปรไฟล์ 24 สายพันธุ์นกจาก `bird24-v2`: **24 มิติ** (น้ำหนัก `25%`) + สีขนนกกลางลำตัว: **96 มิติ** (น้ำหนัก `30%`)
- **สำหรับกระต่ายและแฮมสเตอร์ (`384-dim` 2-Signal Fusion):**
  - `dinov2-small-q4`: **288 มิติ** (น้ำหนัก `55%`) + สีขนกลางลำตัว: **96 มิติ** (น้ำหนัก `45%`)
- **Multi-View Matching:** รองรับการอัปโหลด 1–2 มุม (เช่น หน้าตรง + ลำตัว) และเฉลี่ยคะแนน Cosine Similarity (`averageQuerySimilarity`)

### 3.4 รายชื่อสายพันธุ์ที่ AI รองรับครบถ้วน
- **สุนัขและแมว 37 สายพันธุ์ (`oxford37-v5`):**
  - **แมว (12 พันธุ์):** `abyssinian`, `bengal`, `birman`, `bombay`, `british_shorthair`, `egyptian_mau`, `maine_coon`, `persian`, `ragdoll`, `russian_blue`, `siamese`, `sphynx`
  - **สุนัข (25 พันธุ์):** `american_bulldog`, `american_pit_bull_terrier`, `basset_hound`, `beagle`, `boxer`, `chihuahua`, `english_cocker_spaniel`, `english_setter`, `german_shorthaired`, `great_pyrenees`, `havanese`, `japanese_chin`, `keeshond`, `leonberger`, `miniature_pinscher`, `newfoundland`, `pomeranian`, `pug`, `saint_bernard`, `samoyed`, `scottish_terrier`, `shiba_inu`, `staffordshire_bull_terrier`, `wheaten_terrier`, `yorkshire_terrier`
- **นก 24 สายพันธุ์ (`bird24-v2` — ชุดภาพ iNaturalist 2,520 ภาพ):**
  1. `budgerigar` (หงส์หยก)
  2. `cockatiel` (ค็อกคาเทล)
  3. `sun_conure` (ซันคอนัวร์)
  4. `green_cheeked_conure` (กรีนชีคคอนัวร์)
  5. `peach_faced_lovebird` (เลิฟเบิร์ดหน้าแดง)
  6. `fischers_lovebird` (เลิฟเบิร์ดขอบตาขาว)
  7. `pacific_parrotlet` (ฟอพัส / พารอตเลต)
  8. `monk_parakeet` (ม๊องค์พาราคีต / เควกเกอร์)
  9. `rose_ringed_parakeet` (ริงเน็ก / นกแขกเต้า)
  10. `african_grey` (แอฟริกันเกรย์)
  11. `blue_and_yellow_macaw` (มาคอว์บลูแอนด์โกลด์)
  12. `scarlet_macaw` (สการ์เลตมาคอว์)
  13. `sulphur_crested_cockatoo` (นกกระตั้วหงอนเหลือง)
  14. `eclectus_parrot` (นกเอคเลคตัส)
  15. `red_whiskered_bulbul` (นกกรงหัวจุก / ปรอดหัวโขน)
  16. `zebra_finch` (ซีบราฟินช์)
  17. `gouldian_finch` (ฟินช์เจ็ดสี / กูลเดียนฟินช์)
  18. `java_sparrow` (นกกระจอกชวา)
  19. `zebra_dove` (นกเขาชวา)
  20. `rock_pigeon` (นกพิราบ)
  21. `japanese_quail` (นกกระทาญี่ปุ่น)
  22. `common_hill_myna` (นกขุนทอง)
  23. `common_myna` (นกเอี้ยง)
  24. `domestic_canary` (นกคีรีบูน)

---

## 4. แหล่งประกาศสาธารณะ 12 เว็บไซต์ & 31 กลุ่ม Facebook (`source-catalog.json`)

### 4.1 เว็บไซต์ประกาศสาธารณะที่เชื่อมเข้า AI อัตโนมัติ (12 แหล่ง)
1. **JS100** (`https://www.js100.com/en/site/lost_found`) — 8 รายการในการเช็กสดล่าสุด
2. **FM91 (สวพ.91)** (`https://fm91bkk.com/lostandfound`) — 12 รายการ
3. **Foundy** (`https://foundy.pet/lost-pets`) — 24 รายการ
4. **iFoundPet** (`https://ifoundpet.com/announcement`) — 23 รายการ
5. **Kwanma (ขวัญมา)** (`https://www.kwanma.com/map`) — 37 รายการ
6. **PetHub Thai** (`https://pethubthai.com/`) — 3 รายการ
7. **PetFindHome** (`https://petfindhome.com/`) — เชื่อมต่อพร้อมอ่าน
8. **PetFinder (PetFF)** (`https://www.petff.in.th/list/lost`) — 41 รายการ
9. **Pawsociety** (`https://pawsociety.pet/`) — 80 รายการ (รวมดึงโพสต์สาธารณะจากกลุ่ม Facebook และกลุ่มนกหายเข้าเทียบ AI อัตโนมัติ)
10. **Petio** (`https://petio.care/social-watch`) — เชื่อมต่อพร้อมซิงก์รายชื่อกลุ่ม Facebook
11. **BirdBack (เพื่อนรักนกของเรา)** (`https://tagme.love/lost_birds.php`) — 32 รายการ (เฉพาะทางประกาศนกหาย)
12. **Pantip (ห้องจตุจักร)** (`https://pantip.com/forum/jatujak`) — 9 รายการ (กรองเฉพาะกระทู้สัตว์หาย/พบจริงที่มีภาพ `ptcdn`)

*(ผลเช็กสดรอบล่าสุดผ่าน `check-release.mjs --online`: เชื่อมต่อผ่านครบ **12/12 แหล่ง** รวม **269 ประกาศสด**)*

### 4.2 ช่องทางเปิดค้นต่อใน Catalog (7 แหล่ง — รวมทั้งหมด 19 ช่องทาง)
- **เว็บไซต์เปิดค้นต่อ (4 แหล่ง):** DOT PET (`dotpet.app`), Pawground (`pawground.co`), หานก.com (`lostbirdthailand.com`), ThaiPBS ข่าวสัตว์หาย (`thaipbs.or.th`)
- **แอปและโซเชียล (3 แหล่ง):** Missing Pets (Android), iFoundPet ผ่าน LINE (`connect.ifoundpet.com`), Facebook (`facebook.com`)

### 4.3 ระบบเชื่อมกลุ่ม Facebook ในระบบ (31 กลุ่ม)
- เก็บถาวรในตาราง `facebook_groups` ของ SQLite และซิงก์เพิ่มอัตโนมัติจาก Petio (แบ่งตามหมวด: ทุกชนิด `14` กลุ่ม, แมว `9` กลุ่ม, สุนัข `4` กลุ่ม, นก `4` กลุ่ม — ครอบคลุมทั้ง กทม. และภูมิภาค เช่น นนทบุรี นครปฐม ชลบุรี พัทยา เชียงใหม่ โคราช ฯลฯ)
- **Facebook Match Showcase (`matching.js`):** เมื่อค้นหาด้วยภาพ หากพบโพสต์คล้ายจากกลุ่ม Facebook (แม้ไม่ได้อยู่ใน Top-5 แรก) ระบบจะดึงขึ้นมาแสดงในกล่อง **“แนะนำสัตว์ที่คล้ายกันจากกลุ่ม Facebook”** พร้อมลิงก์เปิดโพสต์ตรงกลุ่มและปุ่มเปิดค้นหาในกลุ่มด้วยคำค้นจาก AI
- **นำเข้าภาพจากกลุ่มไว (`Ctrl+V`):** เปิดดูรายชื่อกลุ่มและวางรูปโพสต์จาก Facebook ได้สูงสุด 6 รูปพร้อมกันในแถบเมนูลัดด้านซ้าย (`#sideDock → กลุ่ม Facebook ในระบบ`) เพื่อให้ AI สแกนชนิด/สายพันธุ์และเทียบทันที

### 4.4 กลไกคัดกรองคุณภาพข้อมูล (`search-sources.mjs`)
- ตัดเคสที่ปิดแล้ว (“กลับบ้านแล้ว”, “พบเจ้าของแล้ว”, “หาบ้าน”, กระทู้ปรึกษาทั่วไป, ภาพ `[AI]`)
- ทำ **Canonical URL Deduplication** ตัดพารามิเตอร์ติดตาม (`utm_*`, `fbclid`, `gclid`, `mibextid`, `__cft__*`, `__tn__*`) และตัดภาพซ้ำข้ามเว็บ
- แคชประกาศแต่ละเว็บ 10 นาที + Isolated Timeout ต่อเว็บ (ถ้าเว็บหนึ่งล่มหรือช้า เว็บอื่นยังทำงานต่อได้)

---

## 5. ฐานข้อมูลถาวร, แคชเวกเตอร์ AI และความปลอดภัย (`storage.mjs` & `server.mjs`)

### 5.1 โครงสร้างฐานข้อมูล SQLite 3 (WAL Mode · `data/tamnong.sqlite`) — 9 ตารางหลัก
1. `cases` — เก็บประกาศสัตว์หาย/พบ ชนิด สถานะ พื้นที่ ช่องทางติดต่อ พาธรูป และลิงก์ต้นทาง
2. `sightings` — เก็บเบาะแสที่แจ้งหรือกดบันทึกจากการเทียบภาพ เชื่อมกับ `case_id`
3. `profiles` — ทะเบียนสัตว์เลี้ยงของฉัน พร้อมรูปหลายมุม (`images_json`)
4. `embedding_cache` — **แคชเวกเตอร์ AI ถาวร** (คีย์ `v5-resmlp:<model>:<species>:<imageUrl>`, จำกัดสูงสุด 1,500 แถวและตัดแถวเก่าอัตโนมัติ — ทดสอบจริงเก็บแล้ว 126 รายการ ลดเวลาค้นหาซ้ำข้ามโปรเซสเซิร์ฟเวอร์จาก `115.7 วินาที` เหลือ `41.2 วินาที` บน 207 โพสต์)
5. `activity_logs` — บันทึกประวัติการเพิ่ม/ลบเคส แจ้งเตือน และเชื่อมกลุ่ม
6. `alerts` — กฎการแจ้งเตือนเคสใหม่แยกตามชนิดสัตว์ พื้นที่ และ HTTPS Webhook
7. `alert_notifications` — ประวัติการแจ้งเตือนที่ตรงเงื่อนไขและสถานะอ่านแล้ว/ยังไม่อ่าน
8. `facebook_groups` — รายชื่อ 31 กลุ่ม Facebook ในระบบ + กลุ่มที่ผู้ใช้เพิ่มเอง
9. `app_meta` — เมตาเดตาและสถานะซิงก์ของระบบ

### 5.2 Media Object Store (`data/uploads/`)
- แปลงภาพ Base64 เป็นไฟล์ภาพจริง (`.jpg` / `.png`) โดยคำนวณชื่อไฟล์จากแฮช **SHA-256** เพื่อป้องกันการบันทึกภาพซ้ำและทำให้ไฟล์ SQLite มีขนาดเล็ก

### 5.3 ความปลอดภัยและการแยกสภาพแวดล้อมทดสอบ
- **Static File Allowlist (`isAllowedStaticPath` ใน `server.mjs`):** อนุญาตเสิร์ฟเฉพาะไฟล์หน้าเว็บ, `assets/`, `data/uploads/` และไฟล์ Colab `.ipynb` ที่ผูกไว้ บล็อกการเข้าถึง `/data/tamnong.sqlite`, `/server.mjs`, `/storage.mjs`, `/models/*`, `/.env`, `/.git/*` คืน `404` ทั้งหมด
- **Defensive Security Headers:** ใส่ `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer` ทุกการตอบกลับ
- **Webhook Safety:** อนุญาตเฉพาะ `https://` URL สำหรับ Webhook แจ้งเตือน (`storage.mjs`)
- **Test DB Isolation:** `tests/storage.test.mjs` รันบนโฟลเดอร์ชั่วคราว (`os.tmpdir()` + `DATA_DIR` + `PAWTAL_FRESH_DB=1`) แล้วลบทิ้งหลังจบ เพื่อไม่ให้ `npm test` เขียนข้อมูลทดสอบปนลงฐานข้อมูลจริง

---

## 6. หน้าเว็บและประสบการณ์ผู้ใช้งาน (UI / UX Highlights)

1. **หน้าหลัก (`index.html`, `app.js`, `matching.js`):**
   - หัวเว็บสะอาดตา (`ประกาศหาย / พบ`, `เบาะแสของฉัน`, `แหล่งประกาศ 12 เว็บ`, `🔔 แจ้งเตือน`, `วิธีใช้`, `ลงทะเบียนน้อง`, `＋ แจ้งพบสัตว์`) โดยย้ายกลุ่ม Facebook ไปอยู่ในแถบเมนูลัดด้านซ้าย (`#sideDock`) เพื่อลดความรกของแถบด้านบนโดยยังคงระบบเชื่อมครบ 100%
   - รองรับการเปิด `/#tracking` ข้ามหน้าจาก `/detect.html` และ `/sources.html` (`openTrackingFromHash`)
   - คัดกรองโพสต์ภาพซ้ำชนิดเดียวกันในเครื่องออก (`matching.js`) ไม่ให้ดันประกาศจริงจาก 12 เว็บและกลุ่ม Facebook ตกหน้าแรก
   - มุมมอง **แผนที่จุดหาย–พบ (`case-map.mjs`)** แปลงชื่อเขต กทม. และจังหวัดทั่วไทยเป็นหมุดพิกัดอัตโนมัติ
   - หน้าต่าง **ตรวจสถานะฐานข้อมูล (`#checkDatabaseStats`)** แสดงจำนวนแถวจริงของ `cases`, `sightings`, `profiles`, `embedding_cache`, `facebook_groups`, `alerts` และขนาดไฟล์ใน `data/uploads/`
2. **ห้องตรวจจับ AI 5 ชนิดโฉมใหม่ (`detect.html`, `detect.js`):**
   - แยก 2 แท็บชัดเจน: **🔍 สแกน & เฝ้าระวังพื้นที่** กับ **🎓 โหมดสอน AI (Label)**
   - ปุ่มตัวอย่างด่วน 6 ปุ่ม (`แมวส้ม`, `แมว`, `สุนัข`, `นก`, `กระต่าย`, `แฮมสเตอร์`), รองรับรูปภาพ/วิดีโอ/คลิปเดินข้ามเขต/กล้องสด
   - แสดงผลชนิดสัตว์ + สายพันธุ์ที่ AI คาดการณ์ + สถานะ `IN / OUT` ของเขต 5 มุม + ปุ่ม **🔎 ค้นหาใน 12 เว็บจากรูปนี้ →**
3. **หน้าแหล่งประกาศ (`sources.html`, `sources.js`):**
   - แสดง 12 เว็บอัตโนมัติ, 7 ช่องทางเปิดค้นต่อ และ 31 กลุ่ม Facebook ในระบบพร้อมป้ายหมวดภาษาไทยครบ (`แมว`, `สุนัข`, `นก`, `กระต่าย`, `แฮมสเตอร์`, `ทุกชนิด`) และปุ่มเช็กสถานะเชื่อมต่อสด
4. **สไลด์นำเสนอโปรเจกต์ 23 หน้า (`slides.html`):**
   - ปรับข้อมูลทั้งหมดเป็นเวอร์ชันล่าสุด 23 หน้า (รวมหน้า 17 ใหม่: ตารางเปรียบเทียบ Before → After AI ทั้ง 4 ระบบ + หลัก Zero Test Leakage, อัปเดตภาพหน้าจอจริงทั้งหน้าหลัก/ผลค้นหากลุ่ม FB/ห้องตรวจจับโฉมใหม่, เพิ่ม Tooltip ชื่อสไลด์บนจุดเลขหน้า `1..23`, ตัดปุ่มและกล่องที่ไม่จำเป็นบนหน้า 23 ออกให้สมดุล พร้อมพิมพ์เป็น PDF ได้ทันที)

---

## 7. รายการ REST API Endpoints ทั้งหมด (`server.mjs`)

| Endpoint | Method | หน้าที่ |
| :--- | :---: | :--- |
| `/api/status` | `GET` | สถานะเซิร์ฟเวอร์, โมเดล ONNX, Meta API และจำนวนกลุ่ม Facebook ในระบบ |
| `/api/detection-status` | `GET` | สถานะความพร้อมของ `models/pets5.onnx` และรายชื่อ 5 คลาส |
| `/api/detect-pets` | `POST` | ตรวจจับกรอบสัตว์ 5 ชนิดด้วย `YOLO11n v4` + ตรวจทานกรอบที่ความมั่นใจ `< 0.78` ด้วย `species5-v3` |
| `/api/suggest-species` | `POST` | ระบุชนิดสัตว์ 5 ชนิด (`species5-v3`) พร้อมผลตรวจคุณภาพภาพ |
| `/api/suggest-breed?species=cat\|dog\|bird` | `POST` | แนะนำ 3 อันดับสายพันธุ์ (`oxford37-v5` สำหรับหมา/แมว, `bird24-v2` + Flip-TTA สำหรับนก) |
| `/api/embed?model=pet-base\|dino-bird&species=...` | `POST` | ครอปภาพและสกัดเวกเตอร์ผสาน (`512-dim` หรือ `384-dim`) |
| `/api/search-all?species=...` | `POST` | ค้นหาและจัดอันดับภาพคล้ายจาก 12 เว็บไซต์สาธารณะ + แคชเวกเตอร์ใน SQLite |
| `/api/automatic-post-search` / `/api/ifoundpet-search` | `POST` | ค้นหาเฉพาะ JS100 หรือ iFoundPet พร้อมใช้แคชเวกเตอร์ |
| `/api/source-status` | `GET` | ตรวจสถานะการเชื่อมต่อสดของทั้ง 12 เว็บสาธารณะ + กลุ่ม Facebook |
| `/api/facebook-public-search` | `POST` | ค้นหาจากเพจ Facebook สาธารณะผ่าน Meta Graph API (เมื่อตั้ง Token แล้ว) |
| `/api/database` | `GET` / `POST` | อ่านและซิงก์ข้อมูล `cases`, `sightings`, `profiles` กับ SQLite พร้อมประเมินแจ้งเตือน Webhook |
| `/api/database/stats` | `GET` | อ่านสถิติฐานข้อมูล SQLite, `embedding_cache`, `facebook_groups`, `alerts` และ Media Store |
| `/api/cases/:id` | `DELETE` | ลบประกาศเคสพร้อมเบาะแสและแจ้งเตือน (บังคับตรวจ `X-Owner-Pin` หากตั้ง PIN ไว้) |
| `/api/cases/:id/verify-pin` | `POST` | ตรวจสอบรหัส PIN เจ้าของประกาศ 4–6 หลักก่อนแก้ไขหรือเปลี่ยนสถานะเคส |
| `/api/ocr` | `POST` | อ่านข้อความ เบอร์โทรไทย LINE ID และพื้นที่จากภาพประกาศหรือป้ายปลอกคอ (`tesseract.js`) |
| `/api/line/status` / `/api/line/webhook` | `GET` / `POST` | ตรวจสถานะและรับ Webhook จาก LINE Messaging API (HMAC-SHA256 + ตอบ Flex Card) |
| `/api/admin/warm-cache` | `POST` | สั่งอุ่นแคชเวกเตอร์ AI จาก 12 แหล่งสาธารณะผ่าน Background Worker |
| `/api/alerts` / `/api/alerts/read` / `/api/alerts/:id` | `GET` / `POST` / `DELETE` | จัดการกฎแจ้งเตือน (รองรับเฉพาะ HTTPS Webhook) และทำเครื่องหมายอ่านแล้ว |
| `/api/facebook-groups` / `/api/facebook-groups/:id` | `GET` / `POST` / `DELETE` | อ่าน ซิงก์ เพิ่ม และลบกลุ่ม Facebook ในระบบ |

---

## 8. ชุดอัปเกรดระดับ Production, OCR, LINE Bot & Mobile UX (ล่าสุด)

1. **Hybrid Filtering & Re-ranking (`hybrid-ranking.mjs`):** ผสานคะแนนความคล้ายของภาพ (Cosine Similarity) เข้ากับ **ระยะทางภูมิศาสตร์จริง (Haversine Geo-distance)** และ **ความสดใหม่ของเวลา (Recency — รองรับ ISO / คำไทย / พ.ศ.)** ทั้งฝั่งเคสในระบบและ `/api/search-all` พร้อมแสดงป้าย `📍 ห่าง ~X กม.` / `🕒 ล่าสุดวันนี้` บนการ์ดผลลัพธ์
2. **Coat Pattern & Color Tagging (`coat-tagging.mjs`):** จำแนกโทนสีและลายขนสำหรับสัตว์พันธุ์ผสมในไทยอัตโนมัติ (เช่น `สามสี (คาลิโก้/เปรอะ)`, `ส้ม-ขาว`, `ขาว-ดำ (ทักซิโด้)`, `ลายสลิด / ลายเสือ`) แสดงร่วมกับสายพันธุ์ในฟอร์มค้นหา, กล่องวิเคราะห์สายพันธุ์ และ `/detect.html`
3. **OCR อ่านเบอร์โทร / ป้ายชื่อ / พื้นที่ (`ocr-extract.mjs`):** ใช้ `tesseract.js` (ไทย+อังกฤษ) อ่านข้อความจากภาพประกาศหรือปลอกคอ สกัดเบอร์มือถือไทย (`06/08/09`), เบอร์บ้าน (`02`), `LINE ID` และเขต/จังหวัดเติมลงฟอร์มอัตโนมัติผ่าน `/api/ocr`
4. **LINE Messaging API Bot Webhook (`line-bot.mjs`):** รองรับ `POST /api/line/webhook` ตรวจลายเซ็น HMAC-SHA256 (`X-Line-Signature`), ดาวน์โหลดรูปจาก LINE Content API, รัน AI + Coat + OCR + ค้น 12 เว็บ และตอบกลับเป็น **Flex Message Card** (พร้อมเปิดใช้งานทันทีเมื่อตั้ง `LINE_CHANNEL_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN`)
5. **Auto-Poster Generator พร้อม QR Code แท้ (`poster-generator.mjs`):** สร้างโปสเตอร์ประกาศหาย–พบขนาด `1080×1350 px` ด้วย HTML5 Canvas พร้อม **Pure-JS ISO/IEC 18004 QR Code (Reed-Solomon ECC)** ที่สแกนแล้วเปิด `/?case=<id>` ตรงเข้าหน้าแจ้งเบาะแสของเคสนั้นทันที และดาวน์โหลดเป็น `.png` ได้ในคลิกเดียว
6. **Side-by-Side Zoom & Landmark Pinning (`matching.js` + `pet-ui.css`):** หน้าเทียบรูปซ้าย–ขวารองรับการซูม `1x / 1.5x / 2x / 3x` และการคลิกปักหมุดเลขจุดสังเกต (`1, 2, 3...`) บนภาพทั้งสองฝั่งเพื่อเทียบแผลเป็น ปลอกคอ สีตา หรือปลายหาง
7. **PWA & Mobile Camera Integration (`manifest.json`, `sw.js`, `assets/icon-pawtal.svg`):** ติดตั้งแอปลงหน้าจอมือถือแบบ `standalone` พร้อม Service Worker, แอปช็อตคัต (`/?action=lost`, `/?action=found`) และปุ่ม `📸 ถ่ายรูปจากกล้องทันที` (`capture="environment"`)
8. **Owner PIN Protection (`security.mjs` + `storage.mjs`):** ตั้งรหัส PIN เจ้าของประกาศ 4–6 หลักแบบไม่บังคับตอนโพสต์ เก็บใน SQLite ด้วย salted `scrypt` (`owner_pin_hash`), ไม่เปิดเผยใน JSON/localStorage และบังคับตรวจ PIN (`403`) ก่อนลบ แก้ไข หรือปิดเคส
9. **Rate Limiting & Magic Bytes Validation (`security.mjs` + `image-quality.mjs`):** จำกัดอัตราคำขอแบบ Sliding-Window ต่อ IP (`429` + `Retry-After`) บนทุก API ของ AI/การค้นหา และตรวจ Magic Bytes (`JPG/PNG/WebP/GIF/AVIF`) ก่อนส่งเข้า `sharp` เพื่อกันไฟล์อันตราย (`400`)
10. **Background Pre-Embedding Worker (`background-worker.mjs`):** ดึงประกาศจาก 12 เว็บและคำนวณเวกเตอร์เก็บลง SQLite `embedding_cache` ล่วงหน้าอัตโนมัติทุก 20 นาที (พร้อมปุ่มกดสั่งอุ่นแคชใน Database Inspector และ endpoint `/api/admin/warm-cache`)

---

## 9. ผลการทดสอบและประกันคุณภาพล่าสุด (QA & Verification)

### 9.1 Unit Tests (`npm test`) — **ผ่าน 78 / 78 (0 failed, 0 skipped)**
ครอบคลุม 22 ไฟล์ในโฟลเดอร์ `tests/` (รวมชุดทดสอบใหม่ `tests/production-upgrades.test.mjs`, `tests/ocr-line.test.mjs` และ Owner PIN ใน `tests/storage.test.mjs` ที่รันบน Temp DB อิสระ)

### 9.2 Release Gate (`node scripts/check-release.mjs`) — **ผ่าน 19 / 19**
ตรวจสอบทุกหน้าเว็บ (รวมสไลด์ 24 หน้า), `/manifest.json`, `/sw.js`, บล็อกไฟล์ฐานข้อมูล/หลังบ้าน (`404`), `/api/status`, `/api/line/status`, Magic Bytes rejection (`400`), `/api/ocr` (`tesseract.js`), ONNX inference ของ `pet-base`, `dino-bird`, `species5-v3`, `oxford37-v5` + Coat Tagging, `bird24-v2`, และ `pets5.onnx`

### 9.3 การทดสอบหน้าเว็บจริงบนเบราว์เซอร์ (`http://127.0.0.1:4173`)
- ทดสอบครบทั้ง QR Deep-Link (`/?case=tungthong`), Auto-Poster QR (`ISO v3`, `1080×1350`), ฟอร์มค้นหา + ปุ่มกล้อง + ปุ่ม OCR + ช่อง Owner PIN + Coat Tagging, ผลค้นหา Hybrid Badges, หน้าต่าง Side-by-Side Zoom (`2x`) & Landmark Pinning (`2` หมุด), `/detect.html` Coat Tagging, สไลด์ 24 หน้า (`/slides.html`) และ PWA (`/manifest.json` + `/sw.js` `200`)
- ผลตรวจ: **0 JavaScript console errors**

---

## 10. สิ่งที่เหลือเฉพาะส่วนตั้งค่าภายนอก (External Activation)
1. **LINE Developers Credentials:** ใส่ `LINE_CHANNEL_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN` ใน `.env` / Railway Variables แล้วผูก Webhook URL `https://<domain>/api/line/webhook` ใน LINE Developers Console
2. **Meta App Review:** ยื่นขอสิทธิ์อ่านโพสต์เพจสาธารณะโดยตรง (`META_ACCESS_TOKEN` + `META_PUBLIC_PAGE_IDS`)
3. **ชุดข้อมูลภาคสนามไทย (Field Re-ID Dataset):** สะสมภาพคู่สัตว์ตัวเดียวกันต่างแสง/เวลา/พันธุ์ผสมไทย 100+ เคสอิสระเพื่อยกระดับเกณฑ์ยืนยันตัวตนรายตัว
