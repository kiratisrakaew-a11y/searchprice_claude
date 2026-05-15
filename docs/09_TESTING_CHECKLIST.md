# 09 Testing Checklist

All tests are required for Phase 1.

## 1. Sheet Structure Tests

Required existing raw/source sheets:

- `laborcost_cgd`
- `laborcost_obec`
- `materialcost_obec`
- `materialcost_tpso`
- `MASTER_PRICE_DATABASE`
- `CHECKLIST_2_SCHEMA`

Required control sheets to create if missing:

- `STAGING_NORMALIZED`
- `ALIAS_DICTIONARY`
- `REFRESH_LOG`
- `SEARCH_LOG`

Must not create in Phase 1:

- `COMPARISON_LOG`

## 2. Raw Header Tests

Validate raw headers.

### `laborcost_cgd`

- `category_l1`
- `category_l2`
- `category_l3`
- `item_code`
- `item_description_clean`
- `unit`
- `labor_cost_thb`
- `row_note`
- `context_note`

### `laborcost_obec`

- `category_l1`
- `category_l2`
- `category_l3`
- `item_code`
- `item_description_clean`
- `unit`
- `material_cost_thb`
- `labor_cost_thb`
- `row_note`
- `context_note`

### `materialcost_obec`

- `category_l1`
- `category_l2`
- `category_l3`
- `item_code`
- `item_description_clean`
- `unit`
- `material_cost_thb`
- `labor_cost_thb`
- `row_note`
- `context_note`

### `materialcost_tpso`

Detect response header row containing:

- `id`
- `type`
- `typeName`
- `commodityCode`
- `commodityNameTH`
- `unitName`
- `curMonth`
- `curYear`
- `priceCur`
- `priceVAT`
- `createdAt`

## 3. Schema Tests

Validate:

- `MASTER_PRICE_DATABASE` columns match `/docs/03_DATA_SCHEMA.md`.
- `STAGING_NORMALIZED` columns match `/docs/03_DATA_SCHEMA.md`.
- `REFRESH_LOG`, `SEARCH_LOG`, and `ALIAS_DICTIONARY` schemas match `/docs/03_DATA_SCHEMA.md`.

## 4. Raw Source Mapping Tests

Validate mapping in `/docs/03A_RAW_SOURCE_MAPPING.md` for:

- `laborcost_cgd`
- `laborcost_obec`
- `materialcost_obec`
- `materialcost_tpso`

Specific tests:

- `laborcost_obec` ignores `material_cost_thb` and remains `labor_only`.
- `materialcost_obec` calculates `total_cost = material_cost_thb + labor_cost_thb`.
- `materialcost_tpso` maps `priceCur` to `material_cost`, `total_cost`, and `price`.
- `typeName` maps to `category_level_3` and `region` for TPSO traceability.
- `curYear` and `curMonth` map to effective year/month.

## 5. TPSO API Tests

Test:

- Reads request params from `materialcost_tpso` row 2.
- Calls POST `https://index-api.tpso.go.th/OpenApi/CmiPrice/Month`.
- Successful API fetch writes to `materialcost_tpso` only first.
- Raw sheet layout is rows 1-2 params, row 3 blank, row 4 response header, row 5 data.
- API failure does not clear raw sheet.
- API failure does not change master.
- API 0 rows does not change master.
- Missing response field does not change master.
- `REFRESH_LOG` is written on success and failure.

## 6. Normalize / Search Field Generation Tests

Test generation of:

- `item_name_clean`
- `search_keywords`
- `alias_terms`
- `normalized_text`

Check:

- specs are preserved, such as `2x2.5`, `20mm`, `1/2"`, `VAF`, `THW`.
- alias enrichment uses only active `ALIAS_DICTIONARY` rows.
- notes are not dropped.

## 7. Validation Tests

Critical validation tests:

- Row count = 0.
- Required header missing.
- Header row cannot be detected.
- `item_name_original` blank.
- `unit` blank.
- Both `material_cost` and `labor_cost` blank.
- Negative material cost.
- Negative labor cost.
- `source_name` blank.
- `source_type` blank.
- `price` blank.
- `total_cost` blank.
- API response empty.
- API fail.

Expected result:

- Critical fail blocks master update.
- Warning threshold breach blocks master update.

## 8. Master Replace Tests

Test:

- Old master data is not deleted before validation passes.
- Only updated source rows are replaced.
- Other sources are unaffected.
- Validation failure keeps existing data.
- `data_status` updated.
- `last_refresh_at` updated.

## 9. REFRESH_LOG Tests

Test logging for:

- `success`
- `failed`
- `blocked_by_validation`
- `completed_with_warning`

Ensure row counts, validation counts, action taken, error message, and triggered by are recorded.

## 10. Search Tests

Test:

- Search reads from `MASTER_PRICE_DATABASE` only.
- Exact match.
- Partial match.
- Token match.
- Alias match.
- Simple fuzzy match.
- Sort high to low.
- Limit top 10.
- No display of `source_name`, `source_type`, `match_reason`.
- `SEARCH_LOG` writing.

Example searches:

- `ปูนซีเมนต์`
- `ปลั๊กไฟ`
- `สาย VAF 2x2.5`
- Typo search

## 11. WebApp UI Tests

Test:

- Main search page loads.
- Search input supports Thai, English, and specs.
- Loading state.
- Error state.
- Result card fields.
- User selects result manually.
- No auto-select.
- Detail section is read-only.
- User can choose another result.

## 12. Price Comparison Tests

Test:

- Required `user_price`.
- Required `user_unit`.
- Required `user_quantity`.
- Required `user_price_type`.
- Optional `user_note`.
- `material` compares to `material_cost`.
- `labor` compares to `labor_cost`.
- `total` compares to `total_cost`.
- `unknown` defaults to `total_cost`, fallback to `price`.
- If reference field blank, return `cannot_compare`.
- Calculate `variance_amount` and `variance_percent`.
- Apply ±10% threshold.

## 13. Unit Conversion Tests

Rule-based conversions:

- kg ↔ ton
- g ↔ kg
- m ↔ cm
- m2 ↔ cm2
- m3 ↔ liter
- piece ↔ dozen
- hour ↔ day with assumption
- day ↔ month with assumption

Complex conversions:

- roll → meter
- bag → kilogram
- job → point
- set → item components
- trip → distance/volume

Expected:

- Rule-based runs first.
- Gemini used only when needed.
- If cannot convert, result is `cannot_compare`.

## 14. Gemini Tests

Test:

- Gemini used only for complex unit conversion.
- Structured output.
- `status` exists.
- `assumption_used` exists.
- `cannot_compare_reason` exists when applicable.
- Gemini does not guess prices.
- Gemini does not modify master/source/staging.
- Gemini is not core search engine.
- Gemini fail fallback works.
- Prompt sends only necessary data.
- Prompt does not send master database.
- Prompt does not send credentials.

## 15. Safety / Negative Tests

Ensure system does not:

- Let WebApp edit raw source sheets.
- Let WebApp edit staging.
- Let WebApp edit master.
- Let comparison flow edit master.
- Let Gemini edit master.
- Auto-approve prices.
- Auto-reject prices.
- Auto-learn aliases into master.
- Create/use `COMPARISON_LOG` in Phase 1.
- Add login/dashboard/admin/export in Phase 1.
