# 10 Claude Instructions

## Core Instruction

Implement only the confirmed Phase 1 system described in `/docs`.

This is a Claude-only instruction file.

The current workbook authority is:

```text
database_with_checklist_3.xlsx
```

The source-to-master mapping authority is:

```text
/docs/03A_RAW_SOURCE_MAPPING.md
```

The TPSO API update authority is:

```text
/docs/08_TPSO_API_SPEC.md
```

Do not add features outside scope.

Do not change sheet names, column names, or workflow without explicit instruction.

## Required Reading Order

Before coding, read:

1. `CLAUDE.md`
2. `/docs/01_PROJECT_OVERVIEW.md`
3. `/docs/02_REQUIREMENTS.md`
4. `/docs/03_DATA_SCHEMA.md`
5. `/docs/03A_RAW_SOURCE_MAPPING.md`
6. `/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md`
7. `/docs/05_WORKFLOW.md`
8. `/docs/06_APPS_SCRIPT_SPEC.md`
9. `/docs/07_MATCHING_LOGIC.md`
10. `/docs/08_TPSO_API_SPEC.md`
11. `/docs/08_GEMINI_API_BOUNDARY.md`
12. `/docs/09_TESTING_CHECKLIST.md`
13. `/docs/10_CLAUDE_INSTRUCTIONS.md`

## First Response Before Coding

Before writing code, summarize:

1. Raw workbook sheets detected.
2. Raw-to-master mapping.
3. Missing control sheets to create.
4. TPSO API flow.
5. Implementation modules to create.
6. Safety checks before destructive operations.
7. Test plan.

If any schema mismatch or requirement conflict exists, stop and report it.

## Implementation Scope

Implement:

- Google Sheets custom menu.
- Control sheet initialization.
- Source process actions.
- TPSO API refresh into `materialcost_tpso` only.
- Normalization to `STAGING_NORMALIZED`.
- Validation before master update.
- Source-specific master replacement.
- `REFRESH_LOG`.
- Search engine over `MASTER_PRICE_DATABASE`.
- `SEARCH_LOG`.
- Alias enrichment from `ALIAS_DICTIONARY`.
- Simple WebApp search + compare UI.
- Unit matching and conversion.
- Gemini-assisted unit conversion only for complex unit cases.
- Price comparison display.
- Error handling.
- Test/check routines.

Do not implement:

- Login.
- Role-based permission.
- Approval workflow.
- Full admin panel.
- Dashboard.
- Export report.
- `COMPARISON_LOG`.
- Auto-approve price.
- Auto-reject price.
- Auto-update master price from WebApp.
- Auto-learn alias directly into master.
- AI search engine.
- WebApp edit master/source/staging.

## Raw Data Rules

Use header lookup by name.

Do not assume `materialcost_tpso` header is row 1. Detect the response header row.

For `laborcost_obec`, ignore `material_cost_thb` for pricing.

For `materialcost_tpso`, preserve row 1-2 parameter layout, row 3 blank, row 4 API response header layout, and row 5 onward API response data.

## Schema Guardrails

Use confirmed schemas exactly.

Do not rename:

- Sheets.
- Columns.
- Status values.
- Price basis values.
- Comparison result values.

Use header lookup by column name rather than hardcoded column indexes whenever possible.

## Data Safety

Never delete or replace old master rows before validation passes.

Never rebuild entire `MASTER_PRICE_DATABASE` unless explicitly instructed.

Only replace rows for the updated source.

If validation fails, keep existing master data unchanged.

If warning threshold is exceeded, block the source update.

If TPSO API fails, returns 0 rows, or headers are missing, keep existing master data unchanged.

## WebApp Safety

WebApp may read from:

- `MASTER_PRICE_DATABASE`
- `ALIAS_DICTIONARY` only if necessary

WebApp may write to:

- `SEARCH_LOG` only

WebApp must not write to:

- Raw source sheets
- `STAGING_NORMALIZED`
- `MASTER_PRICE_DATABASE`
- `REFRESH_LOG`
- `ALIAS_DICTIONARY`

## Search Rules

Search must:

- Read only from `MASTER_PRICE_DATABASE`.
- Support exact, partial, token, alias, and simple fuzzy match.
- Use multiple fields.
- Calculate `match_score`.
- Sort high to low.
- Return top 10.
- Write `SEARCH_LOG`.

Search must not:

- Use Gemini as search engine.
- Auto-select result.
- Display `source_name`, `source_type`, or `match_reason` in result card.

## Gemini Rules

Gemini may be used only for complex unit conversion.

Gemini must return structured result.

Gemini must not:

- Guess new prices.
- Change master/source/staging data.
- Approve or reject prices.
- Decide price reasonableness if units cannot be compared.
- Become search engine.
- Auto-select search result.
- Auto-learn aliases into master.

## Credential Rules

Do not hardcode API keys.

Use Script Properties or secure configuration.

Do not log credentials.

Do not show credentials in WebApp.

## Error Handling Rules

Handle errors safely:

- Sheet not found.
- Missing header.
- API fail.
- API returns 0 rows.
- Validation fail.
- Search fail.
- Empty query.
- Selected master id not found.
- Invalid user price.
- Invalid user quantity.
- Empty user unit.
- Invalid user price type.
- Unit conversion fail.
- Gemini fail.

Errors must not corrupt master data.

## Development Behavior

- Keep code modular.
- Avoid one giant script file if practical.
- Use clear function names.
- Use safe validation before destructive actions.
- Add comments only where useful.
- Return structured objects to WebApp.
- Keep user-facing messages readable.
- If requirement conflict is found, stop and report it.
- If workbook schema does not match docs, report before editing.

## Acceptance Criteria

Implementation is acceptable only if it passes `/docs/09_TESTING_CHECKLIST.md`.
