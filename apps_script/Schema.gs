/**
 * Schema.gs — Authoritative header arrays per /docs/03_DATA_SCHEMA.md.
 * Do not reorder; downstream modules rely on header-name lookup, but
 * the canonical order is used for new-sheet creation.
 */

var HEADERS = Object.freeze({
  // MASTER_PRICE_DATABASE — 26 cols (/docs/03_DATA_SCHEMA.md)
  MASTER: [
    'master_id',
    'source_name',
    'source_type',
    'update_frequency',
    'item_code',
    'item_name_original',
    'item_name_clean',
    'category_level_1',
    'category_level_2',
    'category_level_3',
    'unit',
    'price',
    'material_cost',
    'labor_cost',
    'total_cost',
    'price_basis',
    'province',
    'region',
    'effective_year',
    'effective_month',
    'note',
    'search_keywords',
    'alias_terms',
    'normalized_text',
    'data_status',
    'last_refresh_at'
  ],

  // STAGING_NORMALIZED — 29 cols
  STAGING: [
    'staging_id',
    'source_name',
    'source_type',
    'update_frequency',
    'item_code',
    'item_name_original',
    'item_name_clean',
    'category_level_1',
    'category_level_2',
    'category_level_3',
    'unit',
    'price',
    'material_cost',
    'labor_cost',
    'total_cost',
    'price_basis',
    'province',
    'region',
    'effective_year',
    'effective_month',
    'note',
    'search_keywords',
    'alias_terms',
    'normalized_text',
    'validation_status',
    'validation_issues',
    'needs_review',
    'review_note',
    'staged_at'
  ],

  // ALIAS_DICTIONARY — 10 cols
  ALIAS: [
    'alias_id',
    'user_term',
    'canonical_term',
    'related_terms',
    'category_hint',
    'source_type_hint',
    'confidence',
    'active',
    'note',
    'updated_at'
  ],

  // REFRESH_LOG — 18 cols (doc list 1..18; header summary "17" is a typo, list wins)
  REFRESH_LOG: [
    'log_id',
    'source_name',
    'refresh_type',
    'started_at',
    'finished_at',
    'status',
    'source_row_count_before',
    'source_row_count_after',
    'staging_row_count',
    'master_row_count_before',
    'master_row_count_after',
    'validation_pass_count',
    'validation_warning_count',
    'validation_fail_count',
    'needs_review_count',
    'action_taken',
    'error_message',
    'triggered_by'
  ],

  // SEARCH_LOG — 12 cols
  SEARCH_LOG: [
    'search_id',
    'searched_at',
    'user_query',
    'normalized_query',
    'result_count',
    'top_match_id',
    'top_match_score',
    'no_result_flag',
    'suggested_terms',
    'user_selected_master_id',
    'feedback',
    'session_id'
  ]
});

/**
 * Expected headers for raw source sheets (read-only check).
 * Per Milestone 0 §7.1, laborcost_obec workbook reality omits material_cost_thb
 * even though doc says it may exist; treat that column as optional/ignored.
 */
var RAW_EXPECTED_HEADERS = Object.freeze({
  laborcost_cgd: [
    'category_l1', 'category_l2', 'category_l3', 'item_code',
    'item_description_clean', 'unit', 'labor_cost_thb', 'row_note', 'context_note'
  ],
  laborcost_obec: [
    'category_l1', 'category_l2', 'category_l3', 'item_code',
    'item_description_clean', 'unit', 'labor_cost_thb', 'row_note', 'context_note'
  ],
  materialcost_obec: [
    'category_l1', 'category_l2', 'category_l3', 'item_code',
    'item_description_clean', 'unit', 'material_cost_thb', 'labor_cost_thb',
    'row_note', 'context_note'
  ]
});

/** Columns Phase 1 ignores but doc may mention as present in raw. */
var RAW_OPTIONAL_HEADERS = Object.freeze({
  laborcost_obec: ['material_cost_thb']
});

/** TPSO real response header signature (used for dynamic header-row detection). */
var TPSO_RESPONSE_HEADER = Object.freeze([
  'id',
  'type',
  'typeName',
  'commodityCode',
  'commodityNameTH',
  'unitName',
  'curMonth',
  'curYear',
  'priceCur',
  'priceVAT',
  'createdAt'
]);

/** Minimum subset of TPSO headers that must appear in the detected row. */
var TPSO_REQUIRED_HEADER_TOKENS = Object.freeze([
  'commodityNameTH', 'unitName', 'priceCur', 'curMonth', 'curYear'
]);

/** Map managed sheet name -> header array. */
function getManagedSchema_(sheetName) {
  switch (sheetName) {
    case SHEET.MASTER:       return HEADERS.MASTER;
    case SHEET.STAGING:      return HEADERS.STAGING;
    case SHEET.ALIAS:        return HEADERS.ALIAS;
    case SHEET.REFRESH_LOG:  return HEADERS.REFRESH_LOG;
    case SHEET.SEARCH_LOG:   return HEADERS.SEARCH_LOG;
    case SHEET.CHECKLIST:    return null; // doc-only sheet, no header schema
    default: return null;
  }
}
