# 02 Requirements

## 1. Source Registry

| Source Sheet | Use | Raw Header Row | Source Type | Frequency | Update Method | Price Mapping |
|---|---:|---:|---|---|---|---|
| `laborcost_cgd` | yes | 1 | labor | yearly/manual | replace this source only after validation | `labor_cost_thb` → `labor_cost` |
| `laborcost_obec` | yes | 1 | labor | yearly/manual | replace this source only after validation | `labor_cost_thb` → `labor_cost`; ignore `material_cost_thb` |
| `materialcost_obec` | yes | 1 | material + labor | yearly/manual | replace this source only after validation | `material_cost_thb` → `material_cost`; `labor_cost_thb` → `labor_cost` |
| `materialcost_tpso` | yes | row 4 after API layout | material | monthly/API | refresh raw sheet by API, then replace this source only after validation | `priceCur` → `material_cost` |

## 2. Master Price Columns

`MASTER_PRICE_DATABASE` must contain separate price fields:

- `price`
- `material_cost`
- `labor_cost`
- `total_cost`
- `price_basis`

## 3. Source Price Mapping

### `laborcost_cgd`

- `material_cost` = blank
- `labor_cost` = source `labor_cost_thb`
- `total_cost` = source `labor_cost_thb`
- `price` = source `labor_cost_thb`
- `price_basis` = `labor_only`

### `laborcost_obec`

- `material_cost` = blank
- `labor_cost` = source `labor_cost_thb`
- `total_cost` = source `labor_cost_thb`
- `price` = source `labor_cost_thb`
- `price_basis` = `labor_only`
- Important: the raw sheet may contain `material_cost_thb`, but Phase 1 treats this source as labor-only and ignores that column.

### `materialcost_obec`

- `material_cost` = source `material_cost_thb`
- `labor_cost` = source `labor_cost_thb`
- `total_cost` = `material_cost_thb + labor_cost_thb`
- `price` = `total_cost`
- `price_basis` = `material_plus_labor`

### `materialcost_tpso`

- `material_cost` = source `priceCur`
- `labor_cost` = blank
- `total_cost` = source `priceCur`
- `price` = source `priceCur`
- `price_basis` = `material_only`

## 4. Raw Mapping Authority

Use `/docs/03A_RAW_SOURCE_MAPPING.md` for raw column mapping.

Do not infer raw mappings from memory or from similar sheet names.

## 5. Notes Requirement

Notes must be preserved.

- For `laborcost_cgd`, `laborcost_obec`, and `materialcost_obec`, combine `row_note` and `context_note` into `note` without dropping either value.
- If both notes exist, join them in a readable way, for example `row_note | context_note`.
- For `materialcost_tpso`, use blank `note` unless a future raw/API note field is explicitly added.

## 6. Search Requirements

Search must read from `MASTER_PRICE_DATABASE` only.

Fields used for search:

- `item_name_original`
- `item_name_clean`
- `category_level_1`
- `category_level_2`
- `category_level_3`
- `unit`
- `note`
- `search_keywords`
- `alias_terms`
- `normalized_text`

Search must support:

- Exact match.
- Partial match.
- Token match.
- Alias match.
- Simple fuzzy match.

Search results must be ranked by `match_score` descending and limited to top 10.

## 7. Search Result Display

User-facing result cards must display:

- `item_name`
- `unit`
- `material_cost`
- `labor_cost`
- `total_cost`
- `price_basis`
- `note`
- `match_score`
- `needs_review`, if applicable

User-facing result cards must not display:

- `source_name`
- `source_type`
- `match_reason`

## 8. User Selection and Comparison Input

The WebApp must not auto-select a result.

The user must manually select one search result before comparison.

Required input after selection:

- `user_price`
- `user_unit`
- `user_quantity`
- `user_price_type`

Optional input:

- `user_note`

Allowed `user_price_type` values:

- `material`
- `labor`
- `total`
- `unknown`

Default value:

- `unknown`

## 9. Unit Conversion Requirements

The system must check unit matching before comparison.

If units match, compare directly.

If units differ, use rule-based conversion first.

Use Gemini only when the unit is not straightforward and requires interpretation or additional assumptions.

If conversion is not possible, return `cannot_compare` and do not conclude whether the user price is high or low.

## 10. Comparison Requirements

Use threshold ±10%:

- Within ±10% = `close_to_reference`
- More than +10% = `higher_than_reference`
- Less than -10% = `lower_than_reference`
- Cannot convert = `cannot_compare`

Formula:

```text
variance_amount = user_comparable_price - database_reference_price
variance_percent = variance_amount / database_reference_price * 100
```

Phase 1 must not write `COMPARISON_LOG`.

## 11. Logging Requirements

The system must use:

- `REFRESH_LOG` for refresh/process outcomes.
- `SEARCH_LOG` for search behavior.

Phase 1 does not use `COMPARISON_LOG`.
