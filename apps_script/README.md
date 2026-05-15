# Apps Script — Phase 1 BOQ Price Search

Apps Script ที่ผูกกับ workbook `database_with_checklist_3.xlsx` (Google Sheets) Milestone 1 ครอบคลุมเฉพาะ Sheet Setup & Schema Guard ตามที่ระบุใน `/docs/06_APPS_SCRIPT_SPEC.md`

## ไฟล์ใน Milestone 1

| ไฟล์ | หน้าที่ |
|---|---|
| `Code.gs` | `onOpen()` สร้างเมนู **Phase 1 Admin** |
| `Config.gs` | ชื่อ sheets, source registry, allowed enums, TPSO endpoint |
| `Schema.gs` | Header arrays (authoritative) สำหรับ MASTER / STAGING / ALIAS / REFRESH_LOG / SEARCH_LOG + raw expected headers + TPSO probe |
| `SheetUtils.gs` | helpers: `getSheet_`, `ensureSheet_`, `readHeader_`, `validateHeaderExact_`, `headerHasMergedCells_`, `hasDescriptionRowAt2_`, `detectTpsoHeaderRow_` |
| `SheetSetup.gs` | `ensureAllSheets()`, `validateAllSheets()`, `runMilestone1Check()` |
| `Tests.gs` | `runSheetSetupTests()` — 9 tests, in-script |

ยังไม่มี: raw mapping, normalize, validate, master update, search, WebApp, TPSO API call, Gemini

## วิธี Deploy

### ตัวเลือก A — Copy-paste (เร็วสุด)

1. เปิด Google Sheet ที่ผูกกับ workbook
2. **Extensions → Apps Script**
3. ลบ `Code.gs` เริ่มต้น แล้วสร้างไฟล์ใหม่ตามรายชื่อข้างบน (ใช้ `.gs` ทั้งหมด)
4. Copy เนื้อหาจาก repo นี้ใน `apps_script/*.gs` ลงทีละไฟล์
5. Save ทั้งหมด → refresh sheet → จะเห็นเมนู **Phase 1 Admin**

### ตัวเลือก B — clasp (สำหรับ version control)

1. ติดตั้ง [clasp](https://github.com/google/clasp): `npm i -g @google/clasp`
2. `clasp login`
3. copy `.clasp.json.example` → `.clasp.json` แล้วใส่ `scriptId` ของ project
4. `clasp push`

## วิธีรัน Milestone 1

จากเมนู **Phase 1 Admin**:

| Menu | ทำอะไร |
|---|---|
| Run Milestone 1 Check (Ensure + Validate) | สร้าง managed sheets ที่ขาด + validate ทุก required sheet |
| Validate Sheets Only (read-only) | validate อย่างเดียว ไม่สร้าง |
| Run Sheet Setup Tests | รัน 9 tests ใน `Tests.gs` |

ผลลัพธ์ดูที่ **View → Logs** (หรือ `Ctrl+Enter` ใน Apps Script editor)

## Behavior ที่รับประกัน

- ✅ Idempotent: รันซ้ำได้ ไม่สร้าง sheet ซ้ำ ไม่ overwrite header เดิม
- ✅ ไม่แก้ raw source sheets (read-only header check)
- ✅ ไม่สร้าง `ALIAS_SUGGESTIONS` หรือ `COMPARISON_LOG`
- ✅ TPSO header row ตรวจหาแบบ dynamic (ไม่ hardcode row 4)
- ✅ Validation ที่ fail = report เท่านั้น ไม่ลบ/แก้อัตโนมัติ

## Schema Authority

Schema ใน `Schema.gs` ตรงกับ `/docs/03_DATA_SCHEMA.md`:

| Sheet | Columns |
|---|---|
| MASTER_PRICE_DATABASE | 26 |
| STAGING_NORMALIZED | 29 |
| ALIAS_DICTIONARY | 10 |
| REFRESH_LOG | **18** (doc heading "17" เป็น typo — ลิสต์จริง 1–18 ใน doc) |
| SEARCH_LOG | 12 |
