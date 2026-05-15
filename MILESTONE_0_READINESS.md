# Milestone 0 — Project Readiness Report

สถานะ: ✅ **READY** (มี conflict เล็กน้อย — บันทึกใน section 7)
วันที่: 2026-05-15
Branch: `claude/read-claude-md-MyUgT`
Scope: Phase 1 BOQ Price Search (Google Sheets + Apps Script WebApp)

---

## 1. Instruction Inventory

| รายการ | สถานะ |
|---|---|
| `CLAUDE.md` | ✅ มี (Source-of-Truth Order ครบ 11 ระดับ) |
| `/docs/01_PROJECT_OVERVIEW.md` | ✅ |
| `/docs/02_REQUIREMENTS.md` | ✅ |
| `/docs/03_DATA_SCHEMA.md` | ✅ |
| `/docs/03A_RAW_SOURCE_MAPPING.md` | ✅ |
| `/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md` | ✅ |
| `/docs/05_WORKFLOW.md` | ✅ |
| `/docs/06_APPS_SCRIPT_SPEC.md` | ✅ |
| `/docs/07_MATCHING_LOGIC.md` | ✅ |
| `/docs/08_TPSO_API_SPEC.md` | ✅ |
| `/docs/08_GEMINI_API_BOUNDARY.md` | ✅ |
| `/docs/09_TESTING_CHECKLIST.md` | ✅ |
| `/docs/10_CLAUDE_INSTRUCTIONS.md` | ✅ |
| `AGENTS.md` | ⛔ ไม่สร้าง (per user — ใช้ Claude อย่างเดียว) |

---

## 2. Schema Summary (จาก `/docs/03_DATA_SCHEMA.md`)

| Sheet | Columns |
|---|---|
| MASTER_PRICE_DATABASE | 26 |
| STAGING_NORMALIZED | 29 |
| ALIAS_DICTIONARY | 10 |
| REFRESH_LOG | 18 (see §7.6) |
| SEARCH_LOG | 12 |

---

## 3. Raw Source Mapping Matrix

| source | price→master | price_basis | หมายเหตุ |
|---|---|---|---|
| `laborcost_cgd` | `labor_cost_thb` → `price`/`labor_cost`/`total_cost` | `labor_only` | |
| `laborcost_obec` | `labor_cost_thb` → `price`/`labor_cost`/`total_cost` | `labor_only` | docs ระบุ "ignore material_cost_thb" — แต่ workbook จริงไม่มี column นี้ (ดู §7) |
| `materialcost_obec` | `material_cost_thb` + `labor_cost_thb` แยก; `total_cost = sum` | `material_plus_labor` | |
| `materialcost_tpso` | `priceCur` → `price`/`material_cost` | `material_only` | header dynamic (row 4 ปัจจุบัน) |

ฟิลด์ที่ทุก source ต้อง generate: `item_name_clean`, `search_keywords`, `alias_terms`, `normalized_text`

---

## 4. Workbook Verification (จาก `database_with_checklist_3.xlsx`)

### 4.1 Sheets ที่พบจริง
```
['laborcost_cgd', 'laborcost_obec', 'materialcost_obec', 'materialcost_tpso']
```

### 4.2 Required Raw Sheets
| Sheet | มี | แถว × คอลัมน์ | Header ตรง doc? |
|---|---|---|---|
| `laborcost_cgd` | ✅ | 1498 × 9 | ✅ ตรงเป๊ะ |
| `laborcost_obec` | ✅ | 243 × 9 | ⚠️ ไม่มี `material_cost_thb` (ดู §7.1) |
| `materialcost_obec` | ✅ | 1958 × 10 | ✅ ตรงเป๊ะ |
| `materialcost_tpso` | ✅ | 4680 × 26 | ✅ ตรงเป๊ะ |

### 4.3 Header ที่ตรวจสอบ

**laborcost_cgd** (row 1):
`category_l1 | category_l2 | category_l3 | item_code | item_description_clean | unit | labor_cost_thb | row_note | context_note`

**laborcost_obec** (row 1) — เหมือน CGD เป๊ะ:
`category_l1 | category_l2 | category_l3 | item_code | item_description_clean | unit | labor_cost_thb | row_note | context_note`

**materialcost_obec** (row 1):
`category_l1 | category_l2 | category_l3 | item_code | item_description_clean | unit | material_cost_thb | labor_cost_thb | row_note | context_note`

**materialcost_tpso**:
- row 1: `year | month | type` (param labels) ✅
- row 2: `2569 | 4 | 10` (params จริง) ✅
- row 3: blank ✅
- row 4 (real header): `id | type | typeName | commodityCode | commodityNameTH | unitName | curMonth | curYear | priceCur | priceVAT | createdAt` ✅

### 4.4 Sheets ที่คาดว่าควรมี แต่ไม่พบ
| Sheet | สถานะ | การจัดการ |
|---|---|---|
| `MASTER_PRICE_DATABASE` | ❌ ไม่พบ | สร้างโดยสคริปต์ Milestone 1 (CLAUDE.md อนุญาต) |
| `CHECKLIST_2_SCHEMA` | ❌ ไม่พบ | reference doc only — ใช้ `/docs/03` แทนได้ ไม่ block |
| `STAGING_NORMALIZED` | ❌ ไม่พบ | สร้างโดยสคริปต์ Milestone 1 |
| `ALIAS_DICTIONARY` | ❌ ไม่พบ | สร้างโดยสคริปต์ Milestone 1 |
| `REFRESH_LOG` | ❌ ไม่พบ | สร้างโดยสคริปต์ Milestone 1 |
| `SEARCH_LOG` | ❌ ไม่พบ | สร้างโดยสคริปต์ Milestone 1 |

---

## 5. TPSO API Update Flow

1. อ่าน params จาก `materialcost_tpso` row 2 (`year=2569`, `month=4`, `type=10`)
2. POST → `https://index-api.tpso.go.th/OpenApi/CmiPrice/Month`
3. ถ้า fail / 0 rows / header หาย → หยุด + REFRESH_LOG (no master update)
4. ถ้า ok → detect header row จริง (อย่า hardcode row 4) → write raw → normalize → validate → replace **เฉพาะ rows ของ TPSO** ใน master

---

## 6. Master Update Flow

1. raw → normalize → `STAGING_NORMALIZED`
2. validate (critical fail = block; warnings = อาจ block ทั้ง source)
3. ลบ rows เฉพาะ `source_name` ที่ update ใน `MASTER_PRICE_DATABASE`
4. append rows ใหม่
5. write `REFRESH_LOG`

**Guard rail (สำคัญ)**: ห้ามลบ master rows ก่อน validation ผ่าน (CLAUDE.md §10)

---

## 7. Risks / Conflicts Identified

### 7.1 ⚠️ `laborcost_obec` ไม่มี `material_cost_thb` column (Minor)
- `/docs/02` และ `/docs/03A` บอกว่า OBEC labor source "ignores material_cost_thb in Phase 1"
- workbook จริง: ไม่มี column `material_cost_thb` ใน `laborcost_obec` เลย
- **ผลกระทบ**: ไม่ส่งผลต่อ Phase 1 (ignore อยู่แล้ว) แต่ logic mapping ต้องทนกับการที่ column ไม่มีอยู่ — ใช้ header-name lookup และ default = null
- **คำแนะนำ**: เขียน `RawMapping.gs` ให้ "if header missing → skip silently" ไม่ใช่ error

### 7.2 ⚠️ `MASTER_PRICE_DATABASE` และ control sheets ทั้งหมดยังไม่มีในไฟล์
- CLAUDE.md อนุญาตให้สคริปต์สร้างเอง ("Missing control sheets should be created by the script")
- **ผลกระทบ**: ไม่มี เป็นไปตาม spec — สร้างใน Milestone 1

### 7.3 ⚠️ `CHECKLIST_2_SCHEMA` sheet ไม่มี
- `/docs/04` ระบุว่ามีเป็น documentation sheet
- **ผลกระทบ**: ไม่ block ใช้ `/docs/03_DATA_SCHEMA.md` เป็น authority แทนได้

### 7.4 📝 หมายเหตุ: docs สอง "08_"
- `08_TPSO_API_SPEC.md` และ `08_GEMINI_API_BOUNDARY.md` ใช้เลขเดียวกัน — Source-of-Truth Order ใน CLAUDE.md แยกชัดเจน (#7 vs #9) ไม่เป็นปัญหา

### 7.5 📝 ไม่มี Apps Script code
- repo มีเฉพาะ doc + workbook — เริ่มจาก 0 ใน Milestone 1

### 7.7 ⚠️ CLAUDE.md / docs vs workbook: CHECKLIST_2_SCHEMA และ MASTER_PRICE_DATABASE ไม่มีใน .xlsx (พบใน Milestone 1 QA)
- CLAUDE.md ระบุ workbook "facts" ว่ามี `CHECKLIST_2_SCHEMA` และ `MASTER_PRICE_DATABASE` แต่ workbook จริงมีแค่ 4 raw sheets
- **Resolution**: ไม่ใช่ bug ใน code — CLAUDE.md เองบอกว่า "Missing control sheets should be created by the script" และ `ensureAllSheets()` ทำได้ถูกต้อง
- **ผลกระทบ**: ไม่ block การพัฒนา บันทึกเพื่อความโปร่งใส

### 7.6 ⚠️ REFRESH_LOG column count (พบใน Milestone 1)
- `/docs/03_DATA_SCHEMA.md` หัวข้อ REFRESH_LOG ระบุ "Columns must be exactly:" แล้วลิสต์ 1–**18** (`log_id` ... `triggered_by`)
- รายงาน Milestone 0 ต้นฉบับเขียน "17 cols" — **ผิด** จากการสรุปย่อ ไม่ใช่จากการนับ list authoritative
- **แก้แล้ว**: ตาราง §2 ใช้ค่า 18 และ `apps_script/Schema.gs HEADERS.REFRESH_LOG` มี 18 entries ตรง list

---

## 8. Tests Plan สำหรับ Milestone 0

Milestone 0 ไม่มี code → ไม่มี unit test การตรวจสอบทั้งหมดทำผ่าน checklist §4 และ §7 (manual + python read-only)

Test code 15 หมวด (`/docs/09`) ทั้งหมดเริ่มที่ Milestone ถัดไป

---

## 9. ความพร้อมเข้า Milestone 1

✅ Doc ครบ
✅ Workbook โหลด/อ่านสำเร็จ
✅ Raw header ตรงกับ mapping doc (ยกเว้น §7.1 ซึ่งไม่ block)
✅ TPSO layout ตรง spec
✅ ไม่มี conflict ที่ block การพัฒนา

**ข้อสังเกตที่ต้องนำไป implement**:
1. Header-name lookup ต้อง tolerate column ที่ doc บอกว่ามี แต่ไม่มีจริง (§7.1)
2. ต้องสร้าง 6 sheets (`MASTER_PRICE_DATABASE`, `STAGING_NORMALIZED`, `ALIAS_DICTIONARY`, `REFRESH_LOG`, `SEARCH_LOG`, + optional `CHECKLIST_2_SCHEMA`) ใน Milestone 1
3. TPSO header detection ต้อง dynamic (อย่า hardcode row 4)

**รออนุมัติจาก user ก่อนเข้า Milestone 1**
