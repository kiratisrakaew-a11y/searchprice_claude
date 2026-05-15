# 03 Data Schema

## General Sheet Rules

For all database, processing, and log sheets:

- Row 1 = header.
- Row 2 onward = data.
- Header must be one row only.
- No field description row.
- No merged cells.
- No blank row before header.
- No formulas that mutate data outside controlled refresh logic.

Exception:

- `materialcost_tpso` uses the API layout defined in `/docs/08_TPSO_API_SPEC.md`.

## MASTER_PRICE_DATABASE

`MASTER_PRICE_DATABASE` is the final searchable price database.

Columns must be exactly:

1. `master_id`
2. `source_name`
3. `source_type`
4. `update_frequency`
5. `item_code`
6. `item_name_original`
7. `item_name_clean`
8. `category_level_1`
9. `category_level_2`
10. `category_level_3`
11. `unit`
12. `price`
13. `material_cost`
14. `labor_cost`
15. `total_cost`
16. `price_basis`
17. `province`
18. `region`
19. `effective_year`
20. `effective_month`
21. `note`
22. `search_keywords`
23. `alias_terms`
24. `normalized_text`
25. `data_status`
26. `last_refresh_at`

## STAGING_NORMALIZED

`STAGING_NORMALIZED` stores normalized rows and validation results before master update.

The WebApp must not read from this sheet directly.

Columns must be exactly:

1. `staging_id`
2. `source_name`
3. `source_type`
4. `update_frequency`
5. `item_code`
6. `item_name_original`
7. `item_name_clean`
8. `category_level_1`
9. `category_level_2`
10. `category_level_3`
11. `unit`
12. `price`
13. `material_cost`
14. `labor_cost`
15. `total_cost`
16. `price_basis`
17. `province`
18. `region`
19. `effective_year`
20. `effective_month`
21. `note`
22. `search_keywords`
23. `alias_terms`
24. `normalized_text`
25. `validation_status`
26. `validation_issues`
27. `needs_review`
28. `review_note`
29. `staged_at`

## ALIAS_DICTIONARY

Used to enrich `alias_terms`.

Columns must be exactly:

1. `alias_id`
2. `user_term`
3. `canonical_term`
4. `related_terms`
5. `category_hint`
6. `source_type_hint`
7. `confidence`
8. `active`
9. `note`
10. `updated_at`

Rules:

- `active` = `yes` or `no`.
- `confidence` = `high`, `medium`, or `low`.
- `related_terms` separated by comma.
- Use only rows where `active = yes` for enrichment.
- Do not auto-write aliases to this sheet without review.

## REFRESH_LOG

Columns must be exactly:

1. `log_id`
2. `source_name`
3. `refresh_type`
4. `started_at`
5. `finished_at`
6. `status`
7. `source_row_count_before`
8. `source_row_count_after`
9. `staging_row_count`
10. `master_row_count_before`
11. `master_row_count_after`
12. `validation_pass_count`
13. `validation_warning_count`
14. `validation_fail_count`
15. `needs_review_count`
16. `action_taken`
17. `error_message`
18. `triggered_by`

Status values:

- `success`
- `failed`
- `blocked_by_validation`
- `completed_with_warning`

Action values:

- `updated_master`
- `kept_existing_master_data`
- `manual_review_required`

## SEARCH_LOG

Columns must be exactly:

1. `search_id`
2. `searched_at`
3. `user_query`
4. `normalized_query`
5. `result_count`
6. `top_match_id`
7. `top_match_score`
8. `no_result_flag`
9. `suggested_terms`
10. `user_selected_master_id`
11. `feedback`
12. `session_id`

Phase 1 does not use user feedback, but the column may remain for future use.

## ALIAS_SUGGESTIONS

Do not create this sheet in the default Phase 1 build.

If explicitly implemented later, use these columns:

1. `suggestion_id`
2. `user_query`
3. `suggested_user_term`
4. `suggested_canonical_term`
5. `suggested_related_terms`
6. `category_hint`
7. `source_type_hint`
8. `reason`
9. `confidence`
10. `status`
11. `reviewed_by`
12. `reviewed_at`
13. `created_at`

Status values:

- `pending`
- `approved`
- `rejected`

Approved aliases may later be copied into `ALIAS_DICTIONARY` only through a controlled process.
