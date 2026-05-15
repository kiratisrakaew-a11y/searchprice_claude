# 04 Google Sheets Architecture

## Workbook Structure

Raw/source sheets:

1. `laborcost_cgd`
2. `laborcost_obec`
3. `materialcost_obec`
4. `materialcost_tpso`

Processing/control sheets:

1. `STAGING_NORMALIZED`
2. `MASTER_PRICE_DATABASE`
3. `ALIAS_DICTIONARY`
4. `REFRESH_LOG`
5. `SEARCH_LOG`

Documentation sheet:

1. `CHECKLIST_2_SCHEMA`

Do not create `COMPARISON_LOG` in Phase 1.

`ALIAS_SUGGESTIONS` is not part of the default Phase 1 build unless explicitly requested later.

## Sheet Roles

### `laborcost_cgd`

- Raw source sheet.
- Manual update.
- Yearly update.
- Input only.
- WebApp must not read directly.

### `laborcost_obec`

- Raw source sheet.
- Manual update.
- Yearly update.
- Input only.
- WebApp must not read directly.
- Treat as labor-only even if raw `material_cost_thb` exists.

### `materialcost_obec`

- Raw source sheet.
- Manual update.
- Yearly update.
- Input only.
- WebApp must not read directly.

### `materialcost_tpso`

- Raw source sheet.
- API monthly update.
- Input only.
- WebApp must not read directly.
- Uses special API layout:
  - Row 1 = request parameter headers.
  - Row 2 = request parameter values.
  - Row 3 = blank.
  - Row 4 = API response headers.
  - Row 5 onward = API response data.
- Script must find real response header row by fields such as `id`, `type`, `typeName`, `commodityCode`, `commodityNameTH`, `unitName`, `curMonth`, `curYear`, and `priceCur`.
- If header row cannot be found, stop processing and do not update master.

### `STAGING_NORMALIZED`

- Processing sheet.
- Used for normalization and validation before master update.
- WebApp must not read directly.

### `MASTER_PRICE_DATABASE`

- Searchable master database.
- WebApp reads from this sheet only.
- Comparison flow reads from this sheet only.
- User should not edit manually.

### `ALIAS_DICTIONARY`

- Dictionary for user terms, canonical terms, and related search terms.
- Used to enrich `alias_terms`.
- Can be edited only through controlled manual process.

### `REFRESH_LOG`

- Stores refresh/process logs.
- Used for audit.
- WebApp does not read directly.

### `SEARCH_LOG`

- Stores user search behavior.
- Used to improve search quality later.
- WebApp may write to this sheet.

### `CHECKLIST_2_SCHEMA`

- Documentation only.
- Not a data source.
- WebApp must not read.

## Header Rules

For all database/processing/log sheets:

- Header must be one row only.
- Header should be row 1.
- No field description row in row 2.
- No merged cells.
- No blank row before header.

Exception:

- `materialcost_tpso` follows the TPSO API layout in `/docs/08_TPSO_API_SPEC.md`.

## Sheet Creation Rules

If missing, Apps Script may create:

- `STAGING_NORMALIZED`
- `ALIAS_DICTIONARY`
- `REFRESH_LOG`
- `SEARCH_LOG`

Apps Script must not create `COMPARISON_LOG` in Phase 1.

## Sheet Protection

Manual edit allowed:

- `laborcost_cgd`
- `laborcost_obec`
- `materialcost_obec`
- `ALIAS_DICTIONARY`

System/API update only:

- `materialcost_tpso`
- `STAGING_NORMALIZED`
- `MASTER_PRICE_DATABASE`
- `REFRESH_LOG`
- `SEARCH_LOG`

Documentation only:

- `CHECKLIST_2_SCHEMA`

## WebApp Scope

WebApp may read:

- `MASTER_PRICE_DATABASE`
- `ALIAS_DICTIONARY` only if necessary for search

WebApp may write:

- `SEARCH_LOG` only

WebApp must not write:

- Raw source sheets
- `STAGING_NORMALIZED`
- `MASTER_PRICE_DATABASE`
- `REFRESH_LOG`
- `ALIAS_DICTIONARY`

Phase 1 comparison flow does not write `COMPARISON_LOG`.
