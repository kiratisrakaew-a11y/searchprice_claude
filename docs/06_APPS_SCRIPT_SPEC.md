# 06 Apps Script Spec

This document defines responsibilities at the Apps Script level. It does not require exact function names, but implementation should be modular and follow these action groups.

## 1. Recommended Module Structure

Recommended files:

```text
Code.gs
Config.gs
Schema.gs
SheetUtils.gs
RawMapping.gs
Normalize.gs
Validation.gs
MasterUpdate.gs
RefreshLog.gs
Search.gs
SearchLog.gs
UnitConversion.gs
GeminiUnitConversion.gs
TpsoApi.gs
WebApp.gs
Index.html
Tests.gs
```

Claude may adjust file names if Google Apps Script constraints require it, but responsibilities must remain separated.

## 2. Configuration / Constants

Apps Script must define constants for:

- Sheet names.
- Required headers.
- Master schema.
- Staging schema.
- Log schemas.
- Source registry.
- TPSO API endpoint.
- Allowed status values.
- Allowed `price_basis` values.
- Allowed comparison result values.

Do not hardcode column indexes in business logic where header lookup can be used.

## 3. Source Refresh / Process Actions

Apps Script must support:

- Refresh TPSO from API.
- Replace old data in `materialcost_tpso` only after API succeeds and response validates.
- Process `laborcost_cgd`.
- Process `laborcost_obec`.
- Process `materialcost_obec`.
- Check that source sheet exists.
- Check required headers before processing.
- Detect real response header row for `materialcost_tpso`.
- Stop and avoid master changes if API fails or returns 0 rows.

## 4. Normalize Actions

Apps Script must normalize each source into `STAGING_NORMALIZED`:

- Normalize `laborcost_cgd`.
- Normalize `laborcost_obec`.
- Normalize `materialcost_obec`.
- Normalize `materialcost_tpso`.
- Map raw fields using `/docs/03A_RAW_SOURCE_MAPPING.md`.
- Map `material_cost`, `labor_cost`, `total_cost`, and `price` according to confirmed mapping.
- Create `item_name_clean`.
- Create `search_keywords`.
- Enrich `alias_terms` from `ALIAS_DICTIONARY`.
- Create `normalized_text`.
- Set `staged_at`.

## 5. Validation Actions

Apps Script must validate staging before master update:

- Row count not 0.
- Required headers exist.
- `item_name_original` not blank.
- `unit` not blank.
- At least one of `material_cost` or `labor_cost` present.
- No negative prices.
- `source_name` and `source_type` not blank.
- `price` and `total_cost` not blank.
- Warning pattern checks.
- Block if row count drops more than 30% from previous successful run.

## 6. Master Update Actions

Apps Script must:

- Never delete old master data before validation passes.
- Replace only rows for the updated source.
- Avoid rebuilding the full master each time.
- Keep existing rows if validation fails.
- Block entire source if warning threshold is exceeded.
- Avoid affecting other sources.
- Update `data_status`.
- Update `last_refresh_at`.

## 7. REFRESH_LOG Actions

Apps Script must write `REFRESH_LOG` for every source refresh/process attempt.

Log fields include:

- `log_id`
- `source_name`
- `refresh_type`
- `started_at`
- `finished_at`
- `status`
- row counts
- validation counts
- `action_taken`
- `error_message`
- `triggered_by`

## 8. Search Actions

Apps Script must:

- Search `MASTER_PRICE_DATABASE` only.
- Search multiple fields according to matching logic.
- Support exact, partial, token, alias, and simple fuzzy matching.
- Calculate `match_score`.
- Sort by `match_score` descending.
- Limit Phase 1 results to top 10.
- Exclude `source_name`, `source_type`, and `match_reason` from user-facing result cards.
- Write `SEARCH_LOG`.

## 9. SEARCH_LOG Actions

Apps Script must log:

- `user_query`
- `normalized_query`
- `result_count`
- `top_match_id`
- `top_match_score`
- `no_result_flag`
- `suggested_terms`
- `user_selected_master_id` if selected
- `session_id`

Phase 1 does not use user feedback, but column exists for future use.

## 10. User Selection Actions

Apps Script must:

- Receive `selected_master_id`.
- Fetch selected item from `MASTER_PRICE_DATABASE`.
- Return detail data to WebApp.
- Keep detail data read-only.
- Update `SEARCH_LOG` with selected master id if possible.

## 11. Price Comparison Actions

Apps Script must accept:

- `selected_master_id`
- `user_price`
- `user_unit`
- `user_quantity`
- `user_price_type`
- `user_note`

Apps Script must:

- Select reference price based on `user_price_type`.
- Check unit matching.
- Convert units if needed.
- Return `cannot_compare` if conversion is impossible.
- Calculate `variance_amount`.
- Calculate `variance_percent`.
- Use ±10% threshold for result classification.
- Return `conversion_note`.
- Return `assumption_used` if applicable.
- Not write `COMPARISON_LOG` in Phase 1.

## 12. Unit Conversion Actions

Rule-based conversion must be attempted first.

Support:

- kg ↔ ton
- g ↔ kg
- m ↔ cm
- m2 ↔ cm2
- m3 ↔ liter
- piece ↔ dozen
- hour ↔ day with assumption
- day ↔ month with assumption

If rule-based conversion cannot handle the unit, use Gemini only within the boundaries in `/docs/08_GEMINI_API_BOUNDARY.md`.

## 13. TPSO API Actions

Apps Script must:

- Read `year`, `month`, and `type` from `materialcost_tpso` row 2.
- Call TPSO API using spec in `/docs/08_TPSO_API_SPEC.md`.
- Validate HTTP status.
- Validate response structure.
- Validate required response fields.
- Write response to `materialcost_tpso` only after API success.
- Preserve TPSO sheet layout.
- Never write API response directly to `MASTER_PRICE_DATABASE`.

## 14. WebApp UI Actions

Apps Script must support WebApp actions:

- Load WebApp.
- Receive query.
- Return search results.
- Receive selected master id.
- Return selected item detail.
- Receive price comparison input.
- Return comparison result.
- Support loading/error/no-result states.

## 15. Admin / Manual Trigger Actions

Google Sheets custom menu should include:

1. Refresh TPSO from API
2. Process CGD Labor
3. Process OBEC Labor
4. Process OBEC Material
5. Rebuild/Refresh Alias Enrichment
6. Validate Staging
7. Update Master for Selected Source
8. View Last Refresh Status
9. Run Phase 1 Checks

## 16. Error Handling

Handle:

- Sheet not found.
- Missing header.
- API fail.
- API returns 0 rows.
- Validation fail.
- Search fail.
- Empty query.
- Selected master id not found.
- Invalid `user_price`.
- Invalid `user_quantity`.
- Empty `user_unit`.
- Invalid `user_price_type`.
- Unit conversion fail.
- Gemini fail.

Errors must not delete or corrupt master data.

## 17. Safety Boundaries

Apps Script must not:

- Let WebApp edit raw source sheets.
- Let WebApp edit `STAGING_NORMALIZED`.
- Let WebApp edit `MASTER_PRICE_DATABASE`.
- Let comparison flow edit master.
- Let Gemini edit master.
- Auto-approve prices.
- Auto-reject prices.
- Auto-learn aliases into master directly.
- Rebuild master unnecessarily.
- Delete existing data before validation passes.
- Use AI search as Phase 1 core dependency.
