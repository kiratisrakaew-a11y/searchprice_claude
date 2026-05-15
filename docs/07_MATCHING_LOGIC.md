# 07 Matching Logic

## Search Scope

The WebApp must search from `MASTER_PRICE_DATABASE` only.

Gemini must not be used as the Phase 1 search engine.

## Fields Used for Search

Search fields:

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

## Field Priority

Use this priority for scoring:

1. `item_name_clean`
2. `item_name_original`
3. `search_keywords`
4. `alias_terms`
5. `category_level_3`
6. `category_level_2`
7. `category_level_1`
8. `note`
9. `normalized_text`

## Match Types

Search must support:

1. Exact match.
2. Partial match.
3. Token match.
4. Alias match.
5. Simple fuzzy match.

## Ranking

- Calculate `match_score`.
- Sort results by `match_score` descending.
- Limit Phase 1 results to top 10.

Suggested scoring may use weighted points, but Claude must keep it understandable and testable.

## User-Facing Display

Search result cards must display:

- `item_name`
- `unit`
- `material_cost`
- `labor_cost`
- `total_cost`
- `price_basis`
- `note`
- `match_score`
- `needs_review`, if applicable

Search result cards must not display:

- `source_name`
- `source_type`
- `match_reason`

`match_reason` may be useful internally but is not displayed in Phase 1.

## Empty Search Result Handling

If no direct match is found, do not simply show “no data”.

The system should show:

- No direct match message.
- Nearby results if available.
- Suggested terms if available.
- Suggested category if available.

## Search Keywords

`search_keywords` are generated from:

- `item_name_clean`
- `category_level_1`
- `category_level_2`
- `category_level_3`
- `unit`
- `note`

Rules:

- Preserve technical specs such as `2x2.5`, `20mm`, `1/2"`, `VAF`, `THW`.
- Remove duplicates.
- Regenerate at source refresh.
- Do not depend on manual keywords inside monthly replaced source data.

## Alias Terms

`alias_terms` are enriched from `ALIAS_DICTIONARY`.

Rules:

- Use only aliases where `active = yes`.
- Match against `user_term`, `canonical_term`, `related_terms`, and category hints.
- Do not invent aliases automatically.
- Do not auto-add aliases to `ALIAS_DICTIONARY`.

Example:

```text
user_term = ปลั๊กไฟ
canonical_term = เต้ารับไฟฟ้า
related_terms = เต้ารับ, จุดปลั๊ก, outlet, socket
```

If a row contains `เต้ารับ`, it may get alias terms:

```text
ปลั๊กไฟ, เต้ารับไฟฟ้า, จุดปลั๊ก, outlet, socket
```

## Normalized Text

`normalized_text` combines:

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

Then clean:

- Lowercase English.
- Trim spaces.
- Remove duplicates where practical.

## AI Search Boundary

Gemini must not be used as the core Phase 1 search engine.

Search in Phase 1 must be implemented with Apps Script over `MASTER_PRICE_DATABASE`.
