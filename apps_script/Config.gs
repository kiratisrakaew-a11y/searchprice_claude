/**
 * Config.gs — Sheet names, source registry, allowed enums, endpoints.
 * Phase 1 only. No business logic here.
 */

var SHEET = Object.freeze({
  RAW_CGD: 'laborcost_cgd',
  RAW_OBEC_LABOR: 'laborcost_obec',
  RAW_OBEC_MATERIAL: 'materialcost_obec',
  RAW_TPSO: 'materialcost_tpso',
  STAGING: 'STAGING_NORMALIZED',
  MASTER: 'MASTER_PRICE_DATABASE',
  ALIAS: 'ALIAS_DICTIONARY',
  REFRESH_LOG: 'REFRESH_LOG',
  SEARCH_LOG: 'SEARCH_LOG',
  CHECKLIST: 'CHECKLIST_2_SCHEMA'
});

var RAW_SHEETS = Object.freeze([
  SHEET.RAW_CGD,
  SHEET.RAW_OBEC_LABOR,
  SHEET.RAW_OBEC_MATERIAL,
  SHEET.RAW_TPSO
]);

var MANAGED_SHEETS = Object.freeze([
  SHEET.STAGING,
  SHEET.MASTER,
  SHEET.ALIAS,
  SHEET.REFRESH_LOG,
  SHEET.SEARCH_LOG,
  SHEET.CHECKLIST
]);

var REQUIRED_SHEETS = Object.freeze(RAW_SHEETS.concat(MANAGED_SHEETS));

var FORBIDDEN_SHEETS_PHASE_1 = Object.freeze(['ALIAS_SUGGESTIONS', 'COMPARISON_LOG']);

var SOURCE_REGISTRY = Object.freeze({
  laborcost_cgd:       { source_type: 'labor',    update_frequency: 'yearly',  price_basis: 'labor_only' },
  laborcost_obec:      { source_type: 'labor',    update_frequency: 'yearly',  price_basis: 'labor_only' },
  materialcost_obec:   { source_type: 'material', update_frequency: 'yearly',  price_basis: 'material_plus_labor' },
  materialcost_tpso:   { source_type: 'material', update_frequency: 'monthly', price_basis: 'material_only' }
});

var ALLOWED_PRICE_BASIS = Object.freeze([
  'labor_only',
  'material_only',
  'material_plus_labor'
]);

var ALLOWED_REFRESH_STATUS = Object.freeze([
  'success',
  'failed',
  'blocked_by_validation',
  'completed_with_warning'
]);

var ALLOWED_ACTION_TAKEN = Object.freeze([
  'updated_master',
  'kept_existing_master_data',
  'manual_review_required'
]);

var TPSO = Object.freeze({
  endpoint: 'https://index-api.tpso.go.th/OpenApi/CmiPrice/Month',
  paramHeaderRow: 1,
  paramValueRow: 2,
  blankRow: 3,
  expectedFirstDataRow: 5,
  responseHeaderProbeMaxRow: 10
});

/**
 * Sheets the script may clear data rows on (row 2+).
 * Raw source sheets and ALIAS_DICTIONARY are intentionally NOT clearable.
 */
var CLEARABLE_SHEETS = Object.freeze([
  SHEET.STAGING,
  SHEET.MASTER,
  SHEET.REFRESH_LOG,
  SHEET.SEARCH_LOG
]);

/** Short abbreviations for source names, used in deterministic IDs. */
var SOURCE_ABBR = Object.freeze({
  laborcost_cgd:     'cgd',
  laborcost_obec:    'obec_l',
  materialcost_obec: 'obec_m',
  materialcost_tpso: 'tpso'
});
