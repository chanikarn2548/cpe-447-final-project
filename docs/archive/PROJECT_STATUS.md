# สถานะโปรเจกต์ตามน้องโดยรวม

## ล่าสุด: ปิดงาน Object Detector 5 คลาสและเชื่อมระบบครอปครบ 5 ชนิด (16 พ.ย. 2026)

- เพิ่มกรอบแฮมสเตอร์ที่ตรวจด้วยตาอีก 46 ภาพ (รวมเป็น Train 44, Validation 15, Test 15) และขยายอีก 4 คลาส (`cat`, `dog`, `bird`, `rabbit`) เป็น Train 60, Validation 15, Test 15 ต่อคลาส ตรวจ Pixel Hash และ `authorGroup` ไม่ซ้ำข้ามชุด (`manifestHash: 780638efefc162afa43b21540e996bf7b1bc06783be2ecea5dc037eb35f0d509`)
- ฝึก `YOLO11n` 2 ระยะ (`training/train_detector_v3.py`): Stage 1 ที่ 416px 25 epochs (`freeze=10`, `lr0=0.0005`, `mosaic=0.5`, `close_mosaic=10`) + Stage 2 ปรับสเกล 640px 6 epochs (`mosaic=0.0`, `lr0=0.0002`) เลือก Checkpoint ด้วย Validation เท่านั้น
- ผลบนชุด Test เดิม (45 ภาพ): `mAP50` เฉลี่ยขยับจาก `55.84%` เป็น **`90.87%`** (416px) / **`89.11%`** (640px)
- ผลบนชุด Test ขยายใหม่ (75 ภาพ, 640px): `mAP50` เฉลี่ย **`89.96%`** (`cat 92.25%`, `dog 91.81%`, `bird 91.94%`, `rabbit 80.55%`, `hamster 93.27%`) และ Recall รายชนิด `>= 73.33%` ผ่านเกณฑ์ครบทั้ง 5 ชนิด
- ส่งออก `models/pets5.onnx` เปิดใช้งานใน `/detect.html` (`/api/detect-pets`, `customFiveClassDetectorReady: true`) และเชื่อมใน `pet-crop.mjs` เพื่อครอปกระต่ายและแฮมสเตอร์ก่อนสกัดเวกเตอร์ค้นหา (ทดสอบครอป 50 ภาพ ครอปสำเร็จ 42/50 ภาพ โดยทั้ง 42/42 ภาพได้ `IoU >= 0.50`)
- ชุดทดสอบอัตโนมัติ `npm test` ผ่าน **52/52 ข้อ**; รายละเอียดใน [DETECTOR_EXPANDED_RESULTS.md](training/DETECTOR_EXPANDED_RESULTS.md)

## ล่าสุด: รอบฝึก crop และตรวจคู่ผิด 15 พ.ย. 2026

- เตรียม train 378 ภาพให้ตรง API จริง (+flip เป็น 756 ตัวอย่าง) ฝึก 4 แบบรวม 515 epochs เลือก rank64 epoch100 จาก validation
- HSC บน crop pipeline เดียวกัน: Top-1 18→27/128; Top-5 61→76/128
- เพิ่มภาพตรวจ 160 ภาพ / 40 source IDs คัดเหลือ 134 ภาพ / 36 IDs; Top-1 34→35/36 (มี backbone source overlap และภาพฉากซ้ำ)
- ยังไม่เปิดใช้หัวโมเดลใหม่นี้: การจำลองไม่มีตัวจริงหลัง calibration มี HSC false accepts 14→23/128 จึงไม่ผ่านเกณฑ์ปฏิเสธคู่ผิด
- ตรวจเวกเตอร์ฝึกตรงกับ API จริง; tests 28/28; [ผลรอบ crop](training/CROP_TRAINING_2026-11-15.md)

## ล่าสุด: รอบฝึกยาว 15 พ.ย. 2026

- เปิดใช้สายพันธุ์ `oxford37-full-v4` แล้ว: train 3,495 ภาพ (+ flip), 200 epochs เลือก epoch 6 ด้วย validation; official test รวม 3,669 ภาพถูก 3,494 (95.23%) เทียบ v3 3,457 (94.22%)
- ตัวเลขรวมนี้ใช้ test มากกว่ารอบก่อน จึงเทียบรุ่นเก่า/ใหม่บนภาพชุดเดียวกัน ไม่เทียบเปอร์เซ็นต์คนละชุด
- ฝึกแมว residual 265 epochs เลือก 165: Top-5 full-image 60→81/128, Top-1 21→29/128 บน 32 test IDs; ยังไม่แทน pipeline เว็บ เพราะ crop regression มี Top-1 ทิศหนึ่งลดลง
- ฝึก MobileNet จากภาพจริง 30 epochs แล้ว ยังด้อยกว่ารุ่นสัตว์เดิม ไม่เปิดใช้
- API หมา/แมวตรวจรุ่น v4 สำเร็จ; tests ผ่าน 25/25; [รายละเอียดรอบฝึกยาว](training/LONG_ROUND_2026-11-15.md)

## อัปเดตรอบเพิ่มภาพ 15 พ.ย. 2026

- ฝึกหัวสายพันธุ์ Oxford 37 สายพันธุ์ด้วยภาพฝึก 2,220 ภาพ (+ flip); validation 185, test 1,480
- Top-1 บน test เดียวกัน: รุ่นก่อน 1,395/1,480 → รุ่นใหม่ 1,404/1,480 (94.86%); Top-3 ลด 2 ภาพ เหลือ 1,458/1,480
- ติดตั้งโมเดล v3 ในเว็บแล้ว: เปิดรายละเอียดเคสหมา/แมว → ดูสายพันธุ์ที่ลักษณะใกล้เคียง เป็นข้อเสนอให้ตรวจ ไม่ใช่การยืนยันสายพันธุ์หรือตัวตน
- ดาวน์โหลด Cat Individual Images เพิ่ม 320 ภาพ / 80 source IDs สำหรับการฝึกจับคู่ตัวตน คัดภาพกำกวมก่อนฝึก
- คัดเหลือ 271 ภาพ; ฝึก projection แมวด้วยภาพใหม่+เดิม 378 ภาพ / 78 IDs จำนวน 60 epochs เสร็จแล้ว หน้าตรง→มุมบน Top-1 เพิ่ม 11→18/64 แต่ทิศกลับ Top-5 ลด 30→29/64 จึงยังไม่แทนโมเดลค้นหาเดิม
- รายละเอียดพร้อมข้อจำกัด: [รายงานรอบเพิ่มข้อมูล](training/ROUND_DATA_EXPANSION_2026-11-15.md)
- ตัวเลขสายพันธุ์ไม่ใช่ความแม่นยำการค้นหาสัตว์ตัวเดิม และไม่ได้เป็นความคืบหน้ารวมของโปรเจกต์

## การฝึก AI เพิ่ม ณ 14 พ.ย. 2026
- ฝึกหัวจำแนกชนิดครบ 5 ชนิดแล้ว (species5-v1): train 850 ภาพ, validation 136, test 217. Test ถูก 215/217; แมว/หมา/นก 50/50 ต่อชนิด กระต่าย 48/50 แฮมสเตอร์ 17/17 โดยทายกระต่ายผิดเป็นแฮมสเตอร์ 2 ภาพ; baseline 214/217 จึงเพิ่มเพียง 1 ภาพ
- เปิดใช้หัวจำแนก 5 ชนิดใน `/api/suggest-species` และหน้าระบุชนิดก่อนค้นหา เพื่อเสนอชนิดให้ผู้ใช้ตรวจแก้ ไม่ใช่ยืนยันตัวตนหรือกรอบ object detection ตรวจ API กับรูปแต่ละชนิดและรูปเสียผ่านแล้ว ยังไม่ได้ตรวจ UI ใน browser รอบนี้
- ชุดแฮมสเตอร์ Open Images 274 ภาพถูกพักเพราะพบ Label ผิด ใช้ภาพ Commons ที่ตรวจแล้ว 83 ภาพแทน แยกตามผู้ถ่ายและ dHash; ข้อมูลยังน้อยและมีความต่างของแหล่งข้อมูลระหว่างคลาส รายละเอียด `training/SPECIES5_TRAINING.md`
- รอบขยาย v2 ฝึกเสร็จแล้ว: train 1480 ภาพ + flip, validation 185, test 740; head ใหม่ Top-1 703/740 (95.0%), Top-3 734/740 (99.19%). Head รอบแรกเมื่อนำมาวัดบน 740 ภาพเดียวกันได้ 676/740 (91.35%). หลักฐานอยู่ `../training-data/oxford-pets/breed-expanded-v2/` ยังไม่เปิดใช้กับผลค้นหา และไม่ใช่ความแม่นยำจับคู่สัตว์รายตัว
- ฝึกหัวจำแนกสายพันธุ์ 37 กลุ่มบน pet-recognition-base ด้วย CPU สำเร็จแล้ว (backbone ตรึงน้ำหนัก) ใช้ train 370 ภาพพร้อม horizontal flip, validation 185, test 185
- ผลนำร่อง: Top-1 169/185 (91.35%), Top-3 181/185 (97.84%). Baseline centroid Top-1 168/185 ต่างเพียง 1 ภาพ ยังไม่สรุปว่าพัฒนาคุณภาพชัดเจน
- เก็บ weights และรายงานจริงไว้ที่ `../training-data/oxford-pets/breed-pilot-v1/` มีสคริปต์ทำซ้ำ `training/train_breed_cpu.mjs`
- ยังไม่เปิดใช้หัวจำแนกรุ่นทดลองในผลค้นหา และผลนี้ไม่ใช่ความแม่นยำจับคู่สัตว์รายตัว ยังเหลือครอปตัวสัตว์อัตโนมัติ ชุดข้อมูลตัวตนจริง การประเมินภาพนอกชุด/พันธุ์ผสม และอีก 3 ชนิด

## ตัวเว็บหลัก: MVP เริ่มต้น
- จัดการเคสโปรด บันทึกการติดตาม ค้นหาหลายคำ ซ่อนเคสตัวอย่าง เรียงชื่อ/เพิ่มล่าสุด นับผลลัพธ์ และส่งออก CSV ตามตัวกรอง พร้อมป้องกันเซลล์สูตรในไฟล์ CSV
- เบาะแสมีสถานะรอตรวจสอบ/กำลังติดตาม/ตรง/ไม่ตรง และบันทึกผลการติดต่อได้ ยกเลิกการเปลี่ยนในหน่วยความจำเมื่อบันทึกไม่สำเร็จ
- แก้กู้คืนไฟล์สำรองให้รักษาลิงก์รูปภายนอก สถานะเบาะแส บันทึก เคสโปรด และไม่เพิ่มเบาะแสเดิมซ้ำเมื่อกู้ไฟล์ซ้ำ
- ผลค้นหา JS100 เก็บกลุ่มที่สำเร็จไว้แม้โมเดลอีกกลุ่มล้มเหลว และประมวลผลรูปค้นหาครั้งเดียวต่อโมเดลในแต่ละรอบ
- ทดสอบการโหลดสคริปต์ร่วมกัน ตัวกรอง การเปลี่ยนสถานะ/บันทึก พื้นที่เต็ม การกู้คืนซ้ำ CSV และกรณีโมเดลค้นหาบางกลุ่มไม่พร้อมผ่านแล้ว ยังไม่ได้ตรวจหน้าตาในเบราว์เซอร์จริงรอบนี้
- ผลค้นหาภาพมีปุ่มเปิดรูปต้นฉบับกับรูปที่พบเทียบข้างกัน และเก็บผลเป็นเบาะแสผูกกับเคสเดิม พร้อมลิงก์ต้นทาง คะแนน และสถานะรอยืนยัน ป้องกันเก็บผลเดิมซ้ำในเคสเดียวกัน และแจ้งหากพื้นที่จัดเก็บเต็ม
- ลงทะเบียนสัตว์และนำรูป/รายละเอียดเดิมไปสร้างประกาศสัตว์หายได้
- ลงประกาศหาย/พบ เลือกชนิดได้ 5 ชนิด แก้รายละเอียดและแสดงช่องทางติดต่อ
- ส่งรูปแล้วดึงประกาศสัตว์ล่าสุดจากเว็บ JS100 มาเทียบอัตโนมัติ พร้อมเทียบเคสในโปรเจกต์ ไม่ต้องกรอกลิงก์หรือเชื่อม Meta สำหรับแหล่ง JS100
- กรองชนิดสัตว์ พื้นที่ และสถานะ เปิด/ปิดเคสได้
- เบาะแสใหม่ผูกกับเคส เปิดดูรูป ข้อมูล และลิงก์ต้นทางจากเคสเดิมได้
- ปิดเคสแล้วไม่นำไปเสนอเป็นเคสคู่ใหม่ เปิดกลับมาได้
- สำรอง/กู้คืนเคส โปรไฟล์ สถานะ และเบาะแสเป็นไฟล์
- เมื่อเชื่อม Meta ระบบจะดึงโพสต์จากเพจที่มีสิทธิ์มาเทียบอัตโนมัติด้วย โดย Facebook ยังต้องมี token, Page IDs และสิทธิ์จริง

### สถานะการเชื่อม Facebook ณ 14 พ.ย. 2026
- โค้ดเชื่อม Graph API และหน้าเช็กแหล่งประกาศพร้อมแล้ว แต่ยังไม่มี Meta app, token หรือ Page IDs ใน `.env`
- บัญชีติดหน้าลงทะเบียน Meta for Developers ที่ขั้นยืนยันโทรศัพท์: Meta แจ้งว่าส่งรหัสแล้ว แต่ SMS ไม่มาถึงหลังลองส่งซ้ำ การเข้า `/apps/` ยังกลับไปหน้าแรก
- หยุดขอ SMS ซ้ำชั่วคราว; รอให้ระบบปลดข้อจำกัดหรือใช้เบอร์มือถืออีกเบอร์ที่เจ้าของควบคุมได้แล้วรับรหัสเอง จากนั้นกลับไปทำการสมัครใน Meta
- เมื่อเข้าแดชบอร์ดได้ ยังต้องสร้างแอปและขอ PPCA ตามที่ Meta กำหนด การเชื่อมในโค้ดอ่านได้เฉพาะโพสต์ของเพจที่ตั้งค่าไว้ ไม่ใช่การค้นหาทั่ว Facebook
- ระหว่างรอ Facebook แหล่งค้นหารูปสาธารณะที่ทำงานอยู่คือ JS100; ตรวจจำนวนรายการและสถานะได้จากปุ่มตรวจการเชื่อมต่อแหล่งประกาศ

ข้อมูลยังเก็บในเบราว์เซอร์ ไม่มีบัญชีผู้ใช้หรือฐานข้อมูลร่วมกันหลายคน ต้องสำรองไฟล์ก่อนล้างข้อมูลเบราว์เซอร์ โมเดลจับคู่หมา/แมวเปลี่ยนเป็น pet-recognition-base (Apache-2.0) ซึ่งเป็น embedding สำหรับ re-identification ฝึกด้วย Dogs-World (CC0) และ Cat Individual Images (CC BY); ดาวน์โหลดเมื่อเริ่มเทียบครั้งแรกประมาณ 348 MB ส่วนสัตว์อีก 3 ชนิดยังใช้ DINOv2 เทียบภาพทั่วไปเชิงทดลอง ไม่มี identity dataset สำหรับฝึกในโปรเจกต์ และยังต้องประเมินด้วยรูปสัตว์เป้าหมายจริง

## งานหลักที่ยังเหลือก่อนใช้งานจริง
1. ฐานข้อมูลและที่เก็บภาพส่วนกลาง พร้อมบัญชี/สิทธิ์เจ้าของประกาศ
2. ประเมินโมเดลจับคู่ด้วยภาพสัตว์จริงที่ทราบตัวตน และสะสมคู่ภาพที่ผู้ใช้ยืนยันเพื่อฝึกปรับกับข้อมูลโครงงาน
3. เปิดใช้งาน Meta API ด้วยข้อมูลเชื่อมต่อที่มีสิทธิ์ และตรวจผลจริง
4. ลบข้อมูล/ประกาศ จัดการรายงานไม่เหมาะสม และระบบแจ้งเตือน

## ส่วนเสริมสำหรับโจทย์ Object Detection

## สิ่งที่เพิ่มแล้ว
- หน้า `/detect.html`: เพิ่มหลายรูป เลือกสัตว์ 5 คลาส ลากกรอบ Label และส่งออก Dataset พร้อมรูปจริงใน JSON
- สัญญาคลาสตรงกันทั้งระบบ: cat, dog, bird, rabbit, hamster
- Notebook `training/train_pets5.ipynb`: อัปโหลด JSON, ตรวจ Label, แบ่ง train/val/test, fine-tune YOLO11n, augmentation, ประเมินชุด test และ export ONNX พร้อมหลักฐาน
- เพิ่ม Notebook `training/train_pets5_openimages.ipynb`: ดาวน์โหลดภาพที่มี Label จาก Open Images V7 สำหรับ 5 คลาส แล้ว export YOLO, fine-tune, ประเมิน test และ export ONNX โดยไม่ต้องเริ่มวาดกรอบเองทั้งหมด
- การแบ่งข้อมูลป้องกันรูปซ้ำแบบไฟล์เดียวกันข้าม split และตรวจว่าครบ 5 คลาสทุก split ผู้จัด Dataset ยังต้องแยกภาพคล้าย/วิดีโอเดียวกันเอง
- หน้าสาธิตวาดพื้นที่ 5 มุม ตรวจเส้นตัดกัน แสดงสถานะเข้า/ออกจากจุดกึ่งกลางกรอบ และดาวน์โหลดภาพผล
- API รองรับโมเดล ONNX ที่ได้จาก notebook โดยแสดงข้อผิดพลาดชัดเจนหากยังไม่มี weights

## ยังต้องทำจริงก่อนส่งงาน
1. เก็บภาพสัตว์ครบ 5 คลาสและติด Label ให้ครบทุกตัว มีมุม/ระยะ/แสงและพื้นหลังหลากหลาย
2. เปิด `training/train_pets5_openimages.ipynb` ใน Google Colab, เลือก GPU, รันดาวน์โหลด/ตรวจ Label/Train และเก็บผล test จริง จากนั้นทดสอบกับภาพสัตว์ของโครงงานที่ไม่อยู่ในชุด Train
3. วาง pets5.onnx ที่เทรนแล้วใน models และตรวจผลกับรูปใหม่ครบทั้ง 5 ชนิด
4. ถ่ายวิดีโอผลตรวจจับจริง ทั้งในและนอกพื้นที่ พร้อมการ Train และ Label
5. อัปโหลดวิดีโอ ตั้งสิทธิ์ผู้สอน และกรอกข้อมูลสมาชิกทั้ง 4 คน

นี่คือความพร้อมของเครื่องมือและโค้ด มี Notebook ทางเลือกสำหรับใช้ Dataset ที่ติด Label สาธารณะแล้ว แต่ยังไม่มี custom object detector ครบ 5 คลาสที่เทรนเสร็จหรือผลทดสอบการตรวจกรอบ ส่วนหัวจำแนกชนิดและสายพันธุ์ฝึกบน CPU และมีผลทดสอบแล้วตามส่วนต้นของรายงาน ชุดข้อมูลทั่วไปช่วยสอนการจำแนกชนิดสัตว์ ไม่ทดแทนภาพสัตว์ในพื้นที่ใช้งาน และไม่ทำให้ระบบรู้จำสัตว์รายตัวโดยอัตโนมัติ การตรวจจับในขณะนี้รองรับภาพนิ่ง ส่วนวิดีโอและกล้องสดยังไม่ได้เพิ่ม


## การพัฒนาการเตรียมภาพเพื่อค้นหา 14 พ.ย. 2026
- เพิ่ม RF-DETR Nano pretrained สำหรับครอปแมว หมา นกก่อนเทียบภาพทั้งสองฝั่ง ไม่ใช่การฝึกใหม่หรือโมเดล custom 5 คลาส
- ทดสอบตำแหน่ง 30 ภาพ ครอป 25 ภาพ ทั้ง 25 IoU >= 0.5; 5 ภาพคงภาพเต็ม กระต่าย/แฮมสเตอร์ยังคงภาพเต็ม
- เชื่อมใน local embedding/public sources/Facebook code path แล้ว; ทดสอบ API ครบ 5 ชนิดและ syntax ผ่าน ยังไม่วัด identity ranking ก่อน/หลังและไม่ได้ browser-test รอบนี้
- รายละเอียดและคำสั่งติดตั้งซ้ำ: training/PET_CROP.md
- ความพร้อมต้นแบบประเมินประมาณ 60% ตามขอบเขตงาน ไม่ใช่ความแม่นยำ AI; ช่องว่างหลักยังเป็น identity benchmark, custom detector, ฐานข้อมูลกลาง และสิทธิ์ Meta API


## ทดสอบค้นหาสุนัขรายตัว MPDD (นำร่อง)
- ใช้ 491 ภาพ: 24 ตัวสำหรับพัฒนา และ 32 ตัวทดสอบแยก; query 36, gallery 188
- ภาพเต็มและครอป Recall@1/5 = 36/36 เท่ากัน ยังไม่พบการเพิ่มอันดับจากครอป
- query เบลอ sigma 3: Recall@1 34/36, Recall@5 35/36; ยังไม่ใช่ภาพประกาศจริงหรือผลครบทุกชนิด
- รอบนี้เป็นการประเมิน pretrained model ไม่ได้ฝึกน้ำหนักใหม่; ดู training/IDENTITY_EVALUATION.md
- ป้องกันการเทียบเวกเตอร์ต่างขนาด/ข้อมูลเสียทั้ง client และ server; ทดสอบกรณีปกติ/ผิดรูปแบบผ่าน


## ขยายแหล่งประกาศ 14 พ.ย. 2026
- เชื่อม Kwanma (38) และ PetHub Thai (2 หลังตัด [AI]) เพิ่ม; iFoundPet รวมหน้า lost/found 24
- ตรวจรวม 74 ประกาศ จาก 5 ตัวเชื่อม (PetFindHome ยัง 0), แมว 60 หมา 7 นก 7
- หน้า sources.html รวม 14 เว็บ/แอป/ช่องทาง แยก 5 ตัวเชื่อมอัตโนมัติกับลิงก์เปิดค้นต่อ ไม่อ้างว่าเชื่อมครบทุกแอป
- Parser/unit tests 6 กรณีผ่าน และตรวจหน้าแหล่งข้อมูล/สถานะสดใน browser แล้ว


## ฝึก metric รายตัวและความทนภาพเบลอ
- ฝึก diagonal cosine metric 512 ค่า บน MPDD train 240 + blur 240 ภาพ 24 ตัว, hard triplets 480; 3 regularization x100 epochs
- Validation เลือก epoch50/reg0.01; fresh test16ตัว query18 ภาพ: ปกติเดิม/ใหม่18/18, เบลอ17/18 เท่ากัน ไม่ผ่านเกณฑ์ deploy จึงไม่เปลี่ยนโมเดลหลัก
- เปิดใช้คำแนะนำภาพเล็ก/มืด/รายละเอียดน้อย เป็น heuristic ไม่ใช่ confidence; ตรวจภาพเสีย400ก่อนเสนอชนิดและค้นรวม
- Tests9ผ่านและ API smokeผ่าน; ยังไม่ได้ browser-test ข้อความใหม่รอบนี้

## ผลฝึกและทดสอบเพิ่ม 15 พ.ย. 2026
- MPDD metric-v2: ฝึก 95 ตัว 921 ภาพ + blur 921; test 48 ตัว query 50 ภาพ ปกติ 50/50 เท่าเดิม เบลอเดิม 45/50 ใหม่ 44/50 ไม่ deploy
- เพิ่ม synthetic open-set evaluation โดยเลือก threshold บน development เท่านั้น ยังไม่ใช้เป็น confidence ในระบบจริง
- HSC: ตรวจและกักข้อมูลกำกวม เหลือพัฒนา 157 ภาพ train 24 ตัว / validation 7 ตัว; test อีก 32 ตัว 128 ภาพ
- Cat diagonal metric เลือก epoch 0; ensemble เลือก DINO weight 0 จึงยังไม่พบ candidate ที่ควรแทนโมเดลหลัก
- แมวภาพเต็มข้ามมุม Recall@5 = 30/64 ทั้งสองทิศทาง (46.9%); ยังไม่ถึง 70–80% สำหรับการค้นหารายตัวจริง
- Tests 14 ผ่าน; คู่มือ/ข้อจำกัด/คำสั่งทำซ้ำ: training/ROBUSTNESS_EXPANSION.md

## ฝึก backbone โดยตรงบน CPU สำเร็จ
- เพิ่ม training/train_backbone_cpu.py; ฝึก MobileNetV3 Small ทุก convolution stage 8 epochs ด้วยคู่ภาพหน้า/บนของแมวตัวเดียวกันและ hard negatives
- ตรวจ hash ภาพและแยกตัวตน train/validation/test; บันทึก checkpoint ก่อนดูผล test
- อันดับ 5 หน้า→บน ก่อน/หลัง 17/64→18/64; บน→หน้า 14/64→17/64 ยังต่ำกว่าโมเดลเว็บ จึงไม่ deploy
- เป็นโมเดลทดลองใหม่ ไม่ใช่ fine-tune pet-recognition-base ที่ใช้อยู่; เก็บ checkpoint/report ที่ training-data/hsc/backbone-v1

## ทดลองภาพหลายมุม
- เพิ่ม training/evaluate_multiview.mjs: แบ่ง gallery/query คงที่ตาม hash และรวมผลต่อสัตว์หนึ่งตัว
- ภาพหน้าอย่างเดียว Recall@5 39/64; ด้านบนอย่างเดียว 40/64; ทั้งสองมุม 50/64 (78.1%)
- ยังเป็นผลวิจัยจากภาพกล้องเดียวกัน มีภาพมุมใกล้เคียง ไม่ใช่ accuracy ภาคสนาม และยังไม่ได้เพิ่ม multi-photo ในหน้าเว็บ

## รอบฝึกจำแนก 5 ชนิดด้วยภาพเบลอ/มืด
- เพิ่ม --robust ใน training/train_species5_cpu.mjs; ฝึก 100 epochs จากต้นฉบับ 850 ภาพพร้อม crop/flip/blur3/dark35 เลือก epoch1 บน validation 136 ภาพ
- Test เดิม/ใหม่: ปกติ215/217→214/217, blur204/217→202/217, dark215/217→212/217; accepted=false ไม่เปลี่ยนโมเดลเว็บ
- เปรียบเทียบกับน้ำหนักที่ใช้งานจริง รายงานแยกชนิดและ confusion เก็บใน training-data/openimages5/species5-v2-robust/report.json
- ยังไม่ใช่การฝึกตรวจจับหรือยืนยันรายตัวครบ 5 ชนิด

## Residual identity training รอบใหม่
- ฝึก rank32 residual projection บน frozen pet-base 60 epochs ต่อหมา/แมว; training/train_identity_residual.py
- MPDD แยกตัวตน development ใหม่ train76ตัว744ภาพ validation19ตัว; test48ตัว50query
- หมาเลือก epoch50: Recall@1 เท่าเดิม50/50, mAP .943012→.947455 ยังไม่ผ่านเกณฑ์ deploy
- แมวเลือก epoch0: การฝึกเพิ่มทำให้ validation แย่ลง จึงคงโมเดลเดิม ไม่อ้างว่าดีขึ้น
- ผล/selected.pt/selection.json อยู่ training-data/{hsc,mpdd}/residual-v1; ยังไม่มีการเปลี่ยนโมเดลเว็บ

## รอบ 2 ขยาย HSC และฝึก residual
- ดาวน์โหลดเพิ่ม43ภาพ train129→172ภาพ24ตัว, validation7/test32ตัวเดิมไม่ปะปน
- ตรวจ contact sheets ภาพใหม่ครบและผูก review กับ manifest SHA256; ยังมีเฟรมใกล้กัน ไม่พิสูจน์ cross-day independence
- ฝึก60epochs เลือก epoch0 ไม่ผ่านเกณฑ์ deployment; ผล test เท่าเดิม
- หลักฐาน training-data/hsc/{expanded-v1,residual-v2}; สคริปต์ prepare_hsc.mjs --expanded, prepare_hsc_expanded_features.mjs, train_identity_residual.py --expanded

## รอบ 3 ข้อมูลใหม่ DogFaceNet
- ดาวน์โหลดชุดใบหน้าจัดแนวจาก Zenodo12578449, CC BY4; ตรวจ MD5 ตรงต้นทาง
- 180ตัว720ภาพ: train80/val20/test80ตัว, แยกตัวตน, exact duplicateตรวจผ่าน; visual reviewตัวอย่าง48ภาพ
- ฝึก60epochs เลือกepoch40; DogFaceNet Recall1 80/80เท่าเดิม mAP .96109→.96213
- ตรวจย้อน MPDD Recall1 50/50เท่าเดิม mAP .94301→.94175 ไม่deploy
- โมเดลต้นทางเคยevaluateDogFaceNet; ภาพใกล้กันทำให้ชุดนี้ยังไม่ใช่fieldaccuracy
- scripts prepare_dogfacenet.py, embed_dogfacenet.mjs, train_identity_residual.py --dogfacenet; artifacts training-data/dogfacenet

## Continued training and two-photo search (15 Nov 2026)
- Six verifier configurations, 450 total epochs; unsafe unknown matching regression means no new model deployed.
- Optional two-photo search shipped for local and public-source ranking; uses existing backbone and mean similarity.
- HSC fixed-gallery 32-case comparison: Top1 16/32 -> 23/32; Top5 21/32 -> 31/32. Different protocol from 128-query cross-view benchmark, not field accuracy.
- Browser search verified; backup/profile preservation verified; 38 tests pass.
- Full report: training/CONTINUED_TRAINING_MULTIPHOTO.md. Production :4173 restarted.

## Crop backbone round (15 Nov 2026)
- Audited 599 source images; no identity/exact-pixel split overlap. 97 cross-split perceptual similarity flags require review; first 8 show shared feeding scene, not identical photos.
- Trained cropped MobileNetV3 student all convolution stages, 15 epochs, selected epoch 5 on validation.
- HSC Top5 student 33/128 -> 54/128; production crop baseline 61/128. No model deployed.
- Match review now displays both query views. Node tests: 40 passed.
- Report: training/CROP_BACKBONE_ROUND.md.

## 224px continuation training (15 Nov 2026)
- Two predeclared distillation configurations, 90 additional epochs total (60 + 30), early stopped on validation stagnation.
- Validation-selected candidate: Top1 23/128 and Top5 65/128 (50.78%); production Top1 18/128 and Top5 61/128 (47.66%).
- Synthetic unknown false accepts worsen 14/128 -> 37/128 with validation-calibrated thresholds. Not deployed; production unchanged.
- Report: training/CONTINUATION_224_RESULTS.md; artifacts training-data/cat-individuals/crop-continuation-v4.

## Separation and balanced training
- 90 additional epochs (30 + 60), no deployment. Balanced validation-selected candidate Top5 58/128, below initial student 65/128 and production 61/128.
- Unknown false accepts 36/128 versus production 14/128. See training/SEPARATION_BALANCED_RESULTS.md.

## Frozen alternatives benchmark
- Tested pinned pet-recognition-large and base mirror-averaged embeddings. Both rejected by validation gate; retained production base.
- Large validation Top1 17/28 vs base 20/28; mirror 19/28. No deployment. Report: training/FROZEN_ALTERNATIVES_RESULTS.md.

## Field benchmark readiness implementation
- Added field-readiness structural checks and CLI. Evaluator blocks image/case/component split overlap before inference.
- splitPairs rejects conflicting species on shared images. 46 tests pass.
- No prepared field datasets found on disk; browser-local data not inspected. No new accuracy claim or model change.
- Execution plan: AI_NEXT_PLAN.md.
