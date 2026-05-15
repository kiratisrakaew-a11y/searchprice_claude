# 03A Raw Source Mapping

## Purpose

This document maps raw columns from `database_with_checklist_3.xlsx` into `STAGING_NORMALIZED` and then `MASTER_PRICE_DATABASE`.

Claude must treat this file as the source-to-master mapping authority.

Do not guess mappings from sheet names or similar column names.

## Common Normalized Fields

All raw sources must be normalized into the shared schema used by `STAGING_NORMALIZED` and `MASTER_PRICE_DATABASE`.

Important shared rules:

- `source_name` = source sheet name.
- `source_type` follows the source registry in `/docs/02_REQUIREMENTS.md`.
- `update_frequency` follows the source registry.
- `item_name_clean` should be generated from the raw item name without changing meaning.
- `search_keywords` must be regenerated during refresh.
- `alias_terms` must be enriched only from active rows in `ALIAS_DICTIONARY`.
- `normalized_text` combines searchable fields.
- `data_status` in master should normally be `active` unless validation marks review conditions.
- `last_refresh_at` is the current refresh timestamp.

## Source: `laborcost_cgd`

### Raw Header Row

Header row = row 1.

### Expected Raw Columns

- `category_l1`
- `category_l2`
- `category_l3`
- `item_code`
- `item_description_clean`
- `unit`
- `labor_cost_thb`
- `row_note`
- `context_note`

### Mapping

| Raw Column | Normalized Column | Rule |
|---|---|---|
| fixed value | `source_name` | `laborcost_cgd` |
| fixed value | `source_type` | `labor` |
| fixed value | `update_frequency` | `yearly/manual` |
| `item_code` | `item_code` | direct |
| `item_description_clean` | `item_name_original` | direct |
| `item_description_clean` | `item_name_clean` | clean text but do not change meaning |
| `category_l1` | `category_level_1` | direct |
| `category_l2` | `category_level_2` | direct |
| `category_l3` | `category_level_3` | direct |
| `unit` | `unit` | direct |
| blank | `material_cost` | blank |
| `labor_cost_thb` | `labor_cost` | numeric |
| `labor_cost_thb` | `total_cost` | numeric |
| `labor_cost_thb` | `price` | numeric |
| fixed value | `price_basis` | `labor_only` |
| blank | `province` | blank unless future raw column is added |
| blank | `region` | blank unless future raw column is added |
| blank or configured value | `effective_year` | use configured source year if available |
| blank | `effective_month` | blank |
| `row_note` + `context_note` | `note` | preserve both values |

## Source: `laborcost_obec`

### Raw Header Row

Header row = row 1.

### Expected Raw Columns

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

### Mapping

| Raw Column | Normalized Column | Rule |
|---|---|---|
| fixed value | `source_name` | `laborcost_obec` |
| fixed value | `source_type` | `labor` |
| fixed value | `update_frequency` | `yearly/manual` |
| `item_code` | `item_code` | direct |
| `item_description_clean` | `item_name_original` | direct |
| `item_description_clean` | `item_name_clean` | clean text but do not change meaning |
| `category_l1` | `category_level_1` | direct |
| `category_l2` | `category_level_2` | direct |
| `category_l3` | `category_level_3` | direct |
| `unit` | `unit` | direct |
| blank | `material_cost` | ignore raw `material_cost_thb` in Phase 1 |
| `labor_cost_thb` | `labor_cost` | numeric |
| `labor_cost_thb` | `total_cost` | numeric |
| `labor_cost_thb` | `price` | numeric |
| fixed value | `price_basis` | `labor_only` |
| blank | `province` | blank unless future raw column is added |
| blank | `region` | blank unless future raw column is added |
| blank or configured value | `effective_year` | use configured source year if available |
| blank | `effective_month` | blank |
| `row_note` + `context_note` | `note` | preserve both values |

Important: `laborcost_obec` is labor-only for Phase 1, even if the raw sheet contains `material_cost_thb`.

## Source: `materialcost_obec`

### Raw Header Row

Header row = row 1.

### Expected Raw Columns

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

### Mapping

| Raw Column | Normalized Column | Rule |
|---|---|---|
| fixed value | `source_name` | `materialcost_obec` |
| fixed value | `source_type` | `material_labor` |
| fixed value | `update_frequency` | `yearly/manual` |
| `item_code` | `item_code` | direct |
| `item_description_clean` | `item_name_original` | direct |
| `item_description_clean` | `item_name_clean` | clean text but do not change meaning |
| `category_l1` | `category_level_1` | direct |
| `category_l2` | `category_level_2` | direct |
| `category_l3` | `category_level_3` | direct |
| `unit` | `unit` | direct |
| `material_cost_thb` | `material_cost` | numeric |
| `labor_cost_thb` | `labor_cost` | numeric |
| calculated | `total_cost` | `material_cost_thb + labor_cost_thb` |
| calculated | `price` | same as `total_cost` |
| fixed value | `price_basis` | `material_plus_labor` |
| blank | `province` | blank unless future raw column is added |
| blank | `region` | blank unless future raw column is added |
| blank or configured value | `effective_year` | use configured source year if available |
| blank | `effective_month` | blank |
| `row_note` + `context_note` | `note` | preserve both values |

## Source: `materialcost_tpso`

### Raw Layout

`materialcost_tpso` must follow the API sheet layout:

```text
Row 1: year | month | type
Row 2: request parameter values
Row 3: blank
Row 4: API response headers
Row 5 onward: API response data
```

The script must detect the actual response header row and must not assume header is row 1.

### Expected API Response Columns

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

### Mapping

| Raw Column | Normalized Column | Rule |
|---|---|---|
| fixed value | `source_name` | `materialcost_tpso` |
| fixed value | `source_type` | `material` |
| fixed value | `update_frequency` | `monthly/API` |
| `commodityCode` | `item_code` | direct |
| `commodityNameTH` | `item_name_original` | direct |
| `commodityNameTH` | `item_name_clean` | clean text but do not change meaning |
| blank | `category_level_1` | blank unless future mapping is added |
| blank | `category_level_2` | blank unless future mapping is added |
| `typeName` | `category_level_3` | use as classification label if useful for search |
| `unitName` | `unit` | direct |
| `priceCur` | `material_cost` | numeric |
| blank | `labor_cost` | blank |
| `priceCur` | `total_cost` | numeric |
| `priceCur` | `price` | numeric |
| fixed value | `price_basis` | `material_only` |
| blank | `province` | blank unless future API field is added |
| `typeName` | `region` | use for traceability when no province exists |
| `curYear` | `effective_year` | direct |
| `curMonth` | `effective_month` | direct |
| blank | `note` | blank unless future API note field is added |

## Helper Field Generation

### `search_keywords`

Generate from:

- `item_name_clean`
- `category_level_1`
- `category_level_2`
- `category_level_3`
- `unit`
- `note`

Rules:

- Preserve technical specs such as `2x2.5`, `20mm`, `1/2"`, `VAF`, `THW`.
- Remove duplicates.
- Do not remove meaningful Thai words.
- Regenerate during each source refresh.

### `alias_terms`

Generate only from active `ALIAS_DICTIONARY` rows.

Do not invent aliases automatically.

### `normalized_text`

Combine:

- `item_name_original`
- `item_name_clean`
- `category_level_1`
- `category_level_2`
- `category_level_3`
- `unit`
- `note`
- `search_keywords`
- `alias_terms`
- `source_type`
- `price_basis`

Then normalize spacing and lowercase English text.
