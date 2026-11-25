# โมเดลตรวจจับสัตว์ 5 ชนิด

`species5-head.json` เป็นหัวจำแนก **ชนิดสัตว์จากภาพ** ที่ฝึกแล้ว ทำงานร่วมกับ DINOv2-small q4 เพื่อเสนอชนิดให้ผู้ใช้ยืนยันก่อนค้นหา ไม่ใช่ตัวตรวจจับกรอบและไม่สามารถใช้แทน `pets5.onnx` ได้ รายงานฝึกอยู่ใน `training/SPECIES5_TRAINING.md`

วาง `pets5.onnx` ที่ export จาก `training/train_detector_v3.py` (หรือ `training/train_pets5.ipynb`) ในโฟลเดอร์นี้ แล้วเปิดหน้า `/detect.html`

สัญญารูปแบบ: YOLO11 Detect, input float32 RGB 1×3×640×640, output raw 1×9×N, classes ตามลำดับ `cat, dog, bird, rabbit, hamster`, ไม่ฝัง NMS, ไม่ใช้ dynamic input และไม่ใช่โมเดล segmentation

ขณะนี้มี `models/pets5.onnx` (ฝึกจาก `YOLO11n` 2 ระยะบนชุดข้อมูล 5 คลาสใน `training/train_detector_v3.py`) ติดตั้งพร้อมใช้งานแล้ว โดยผ่านเกณฑ์รายคลาสครบทั้ง 5 ชนิดบนชุดทดสอบ (`mAP50` เฉลี่ย `89.96%` บนชุด Test ขยาย 75 ภาพ ที่ 640px) ดูรายละเอียดและข้อจำกัดใน `training/DETECTOR_EXPANDED_RESULTS.md`

## โมเดลเทียบสัตว์รายตัว

- หมา/แมวใช้ `pet-recognition-base` จาก Hugging Face รุ่น ONNX ขนาดประมาณ 348 MB; เซิร์ฟเวอร์ดาวน์โหลดและเก็บไว้ใน cache ของเครื่องเมื่อเรียกใช้ครั้งแรก
- โมเดลสร้างเวกเตอร์ภาพ 512 มิติสำหรับจัดอันดับด้วย cosine similarity ไม่ได้ทำนายชื่อหรือยืนยันว่าเป็นสัตว์ตัวเดียวกัน
- ผู้พัฒนาโมเดลระบุว่าฝึก projection บน Dogs-World (CC0) และ Cat Individual Images (CC BY) และทดสอบกับ identities ที่กันออกจาก train: Top-1 dogs 0.612, cats 0.916; ค่าเหล่านี้เป็นผลจากชุด benchmark ของผู้พัฒนา ไม่ใช่ผลวัดกับรูปจากโปรเจกต์นี้
- License ของ weights: Apache-2.0. แหล่ง: https://huggingface.co/open-noodle/pet-recognition-base
- นก กระต่าย และแฮมสเตอร์ยังใช้ DINOv2 เพื่อเทียบภาพทั่วไป เพราะยังไม่มี identity-labeled examples ในโปรเจกต์สำหรับฝึกเฉพาะกลุ่ม
- หากต้องการฝึกเฉพาะสัตว์ในระบบ ต้องมีรูปหลายมุมของสัตว์แต่ละตัว พร้อมรหัสตัวตนที่ยืนยันแล้ว และแยกตัวตน train/test ออกจากกันก่อนวัดผล
