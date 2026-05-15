# 08 Gemini / API Boundary

## Overview

Phase 1 uses two external service groups:

1. TPSO API for monthly material price updates.
2. Gemini for complex unit conversion support only.

TPSO API details are defined in `/docs/08_TPSO_API_SPEC.md`.

## TPSO API Boundary

TPSO API is used to:

- Fetch monthly material prices.
- Write data into `materialcost_tpso` only.
- Trigger normalization into `STAGING_NORMALIZED` after success.
- Update `MASTER_PRICE_DATABASE` only after validation passes.

TPSO API must not:

- Write directly into `MASTER_PRICE_DATABASE`.
- Delete `MASTER_PRICE_DATABASE`.
- Delete existing TPSO master rows before validation passes.
- Affect CGD or OBEC data.
- Change `ALIAS_DICTIONARY`.
- Change `SEARCH_LOG`.

## TPSO Failure Handling

If TPSO API fails:

- Stop process.
- Do not change `MASTER_PRICE_DATABASE`.
- Keep existing TPSO master rows.
- Write `REFRESH_LOG` with `failed`.
- Capture safe `error_message`.

If API returns 0 rows:

- Treat as failure or `blocked_by_validation`.
- Do not replace existing master data.
- Write `REFRESH_LOG`.
- Error message should say API returned 0 rows.

If API structure changes:

- If required header is missing, fail.
- Do not guess risky column mapping.
- Do not update master.

## Gemini Scope

Gemini may be used only for complex unit conversion.

Gemini may:

- Interpret non-standard units.
- Suggest what additional data user must provide.
- Explain conversion assumptions.
- Help calculate when conversion factor is clear.
- Return `cannot_compare` when data is insufficient.

Examples:

- User unit = roll, database unit = meter. Ask how many meters per roll.
- User unit = bag, database unit = kilogram. Ask kg per bag.
- User unit = job, database unit = point. Ask number of points per job.

## Gemini Prohibited Actions

Gemini must not:

1. Guess new prices.
2. Change prices from `MASTER_PRICE_DATABASE`.
3. Overwrite `MASTER_PRICE_DATABASE`.
4. Update raw source sheets.
5. Update `STAGING_NORMALIZED`.
6. Update `ALIAS_DICTIONARY` directly.
7. Update `SEARCH_LOG` directly.
8. Approve prices.
9. Reject prices.
10. Conclude high/low price if units cannot be compared.
11. Act as Phase 1 core search engine.
12. Auto-select search results.
13. Auto-learn aliases into master.

## Gemini Output Format

Gemini must return structured result only.

Required fields:

1. `status`
2. `conversion_possible`
3. `required_user_input`
4. `conversion_factor`
5. `converted_value`
6. `converted_unit`
7. `assumption_used`
8. `explanation`
9. `cannot_compare_reason`

Status values:

- `success`
- `need_more_info`
- `cannot_compare`
- `error`

## Gemini Failure Handling

If Gemini fails:

- System must not crash.
- If rule-based conversion works, use rule-based conversion.
- If not, return `cannot_compare`.
- Show safe message that unit interpretation is unavailable.
- Do not change master data.
- Do not retry indefinitely.

## Gemini Prompt Boundary

Send only necessary information:

- `database_unit`
- `user_unit`
- `user_quantity`
- `user_price_type`
- `selected_item_name`
- `note` if necessary
- known conversion facts if any

Do not send:

- Entire `MASTER_PRICE_DATABASE`.
- Entire source sheets.
- Irrelevant data.
- Personal user data.
- Credentials or API keys.

## API Key / Credential Handling

Rules:

- Do not hardcode API keys.
- Use Script Properties or secure configuration.
- Do not show API keys in WebApp.
- Do not log API keys.
- If key is missing, show a safe error.
