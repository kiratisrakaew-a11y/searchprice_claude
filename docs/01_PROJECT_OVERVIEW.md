# 01 Project Overview

## Purpose

Build a Phase 1 BOQ / construction / service / material price reference search system using Google Sheets, Google Apps Script, and a simple WebApp.

The system uses raw sheets from `database_with_checklist_3.xlsx`, normalizes them into `STAGING_NORMALIZED`, validates them, then safely updates `MASTER_PRICE_DATABASE`.

Users search the master database, manually select a result, enter their own price/unit/quantity, and compare against the selected reference price.

## Confirmed Raw Source Sheets

The current workbook contains these raw source sheets:

1. `laborcost_cgd`
2. `laborcost_obec`
3. `materialcost_obec`
4. `materialcost_tpso`

It also contains:

1. `CHECKLIST_2_SCHEMA`
2. `MASTER_PRICE_DATABASE`

The script must create missing processing/control sheets if they do not exist:

1. `STAGING_NORMALIZED`
2. `ALIAS_DICTIONARY`
3. `REFRESH_LOG`
4. `SEARCH_LOG`

Do not create `COMPARISON_LOG` in Phase 1.

`ALIAS_SUGGESTIONS` is not required in the default Phase 1 implementation. It may be added later only if explicitly instructed.

## Main Goals

1. Normalize different raw source schemas into one master schema.
2. Preserve raw source data and prevent unsafe overwrites.
3. Support practical search across item names, categories, units, notes, keywords, aliases, and normalized text.
4. Show candidate results and allow the user to choose manually.
5. Compare user-provided price against the selected database reference.
6. Use rule-based unit conversion first.
7. Use Gemini only for complex unit interpretation.
8. Use TPSO API for monthly refresh of `materialcost_tpso` only.
9. Maintain auditability through `REFRESH_LOG` and `SEARCH_LOG`.
10. Keep implementation strictly within Phase 1.

## Confirmed Phase 1 Scope

Phase 1 includes:

- Google Sheets custom menu.
- Control sheet initialization.
- Manual source processing.
- TPSO API refresh into `materialcost_tpso`.
- Normalization into `STAGING_NORMALIZED`.
- Validation before master update.
- Source-specific replacement into `MASTER_PRICE_DATABASE`.
- `REFRESH_LOG`.
- Search from `MASTER_PRICE_DATABASE` only.
- `SEARCH_LOG`.
- Alias enrichment from `ALIAS_DICTIONARY`.
- Simple WebApp for search + compare.
- User manual selection of search result.
- Unit matching and unit conversion.
- Gemini-assisted unit conversion only when rule-based conversion is insufficient.
- Price comparison display.
- Testing/check routines.

## Phase 1 Exclusions

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
- WebApp editing of master/source/staging sheets.

## Data Flow

```text
RAW SOURCE SHEETS
→ STAGING_NORMALIZED
→ MASTER_PRICE_DATABASE
→ WEBAPP SEARCH
→ USER SELECTS RESULT
→ USER INPUTS PRICE / UNIT / QUANTITY / PRICE TYPE
→ UNIT MATCHING / CONVERSION
→ PRICE COMPARISON RESULT
```

## External Services

1. TPSO API, used only to update `materialcost_tpso`.
2. Gemini, used only for complex unit conversion support.

## Implementation Principle

Treat `MASTER_PRICE_DATABASE` like a warehouse ledger, not a scratchpad. Do not replace existing master rows until staging validation passes.
