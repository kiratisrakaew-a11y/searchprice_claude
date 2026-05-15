/**
 * SheetUtils.gs — Generic sheet helpers. No business logic.
 * Functions ending with `_` are file-local by Apps Script convention.
 */

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Return Sheet or null. Never throws on missing. */
function getSheet_(name) {
  return getSpreadsheet_().getSheetByName(name) || null;
}

/**
 * Ensure a sheet exists. If created, write `headers` to row 1 and freeze it.
 * If it already exists, do not touch existing data or headers.
 * @return {{created: boolean, sheet: Sheet}}
 */
function ensureSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    return { created: false, sheet: sheet };
  }
  sheet = ss.insertSheet(name);
  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return { created: true, sheet: sheet };
}

/** Read row 1 as a string array (trimmed). Returns [] if sheet empty. */
function readHeader_(sheet) {
  if (!sheet) return [];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  var row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var out = [];
  for (var i = 0; i < row.length; i++) {
    var v = row[i];
    out.push(v === null || v === undefined ? '' : String(v).trim());
  }
  // Trim trailing blanks
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

/**
 * Validate header exactly matches `expected` (order + length).
 * Optional `optional` headers may be missing without failing.
 * @return {{ok: boolean, missing: string[], extra: string[], outOfOrder: string[]}}
 */
function validateHeaderExact_(actual, expected, optional) {
  optional = optional || [];
  var missing = [];
  var extra = [];
  var outOfOrder = [];

  var expectedSet = {};
  for (var i = 0; i < expected.length; i++) expectedSet[expected[i]] = i;

  // Missing
  for (var j = 0; j < expected.length; j++) {
    if (actual.indexOf(expected[j]) === -1) {
      if (optional.indexOf(expected[j]) === -1) missing.push(expected[j]);
    }
  }

  // Build optional set so optional columns are excluded from both missing AND extra
  var optionalSet = {};
  for (var i2 = 0; i2 < optional.length; i2++) optionalSet[optional[i2]] = true;

  // Extra (actual not in expected AND not optional/ignored)
  for (var k = 0; k < actual.length; k++) {
    if (expectedSet[actual[k]] === undefined && !optionalSet[actual[k]]) extra.push(actual[k]);
  }

  // Out of order — only check among present-and-expected
  var filtered = [];
  for (var m = 0; m < actual.length; m++) {
    if (expectedSet[actual[m]] !== undefined) filtered.push(actual[m]);
  }
  var expectedFiltered = [];
  for (var n = 0; n < expected.length; n++) {
    if (filtered.indexOf(expected[n]) !== -1) expectedFiltered.push(expected[n]);
  }
  for (var p = 0; p < filtered.length; p++) {
    if (filtered[p] !== expectedFiltered[p]) {
      outOfOrder.push(filtered[p] + ' (expected ' + expectedFiltered[p] + ')');
    }
  }

  return {
    ok: missing.length === 0 && extra.length === 0 && outOfOrder.length === 0,
    missing: missing,
    extra: extra,
    outOfOrder: outOfOrder
  };
}

/**
 * Check if any merged cells exist anywhere in the sheet's used range.
 * /docs/03_DATA_SCHEMA.md rule: "No merged cells" applies to the whole sheet.
 * @return {boolean} true if a merge was found.
 */
function sheetHasMergedCells_(sheet) {
  if (!sheet) return false;
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return false;
  var ranges = sheet.getDataRange().getMergedRanges();
  return ranges && ranges.length > 0;
}

/**
 * Detect a "field description row" at row 2.
 * Three heuristics (any one triggers):
 *   1. Row 2 is an exact echo of row 1.
 *   2. Any cell in row 2 contains "description" or "คำอธิบาย".
 *   3. Schema-aware: when expectedHeaders given, row 2 looks like Thai label text —
 *      ≥50% of schema columns are populated, all populated cells are strings,
 *      and none contain an underscore (our schema headers always use underscores).
 *
 * @param {Sheet} sheet
 * @param {string[]} [expectedHeaders]  Schema header list for heuristic 3.
 * @return {boolean}
 */
function hasDescriptionRowAt2_(sheet, expectedHeaders) {
  if (!sheet) return false;
  if (sheet.getLastRow() < 2) return false;
  var lastCol = Math.max(1, sheet.getLastColumn());
  var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

  // Heuristic 1: exact echo
  var echo = true;
  for (var i = 0; i < lastCol; i++) {
    if (String(row1[i]).trim() !== String(row2[i]).trim()) { echo = false; break; }
  }
  if (echo) return true;

  // Heuristic 2: description keyword
  for (var j = 0; j < lastCol; j++) {
    var v = String(row2[j] || '').toLowerCase();
    if (v.indexOf('description') !== -1 || v.indexOf('คำอธิบาย') !== -1) return true;
  }

  // Heuristic 3: schema-aware Thai label detection
  if (expectedHeaders && expectedHeaders.length > 0) {
    var checkCols = Math.min(expectedHeaders.length, lastCol);
    var populated = 0;
    var allStrings = true;
    var anyUnderscore = false;
    for (var k = 0; k < checkCols; k++) {
      var cell = row2[k];
      var s = String(cell === null || cell === undefined ? '' : cell).trim();
      if (s === '') continue;
      populated++;
      if (typeof cell === 'number' || cell instanceof Date) { allStrings = false; break; }
      if (s.indexOf('_') !== -1) { anyUnderscore = true; break; }
    }
    if (allStrings && !anyUnderscore && populated >= Math.ceil(checkCols * 0.5)) return true;
  }

  return false;
}

/**
 * Scan the first `maxRow` rows for the TPSO real response header.
 * Returns the 1-based row index of the first row containing all
 * required TPSO header tokens, or 0 if not found.
 */
function detectTpsoHeaderRow_(sheet, maxRow) {
  if (!sheet) return 0;
  maxRow = maxRow || TPSO.responseHeaderProbeMaxRow;
  var lastCol = Math.max(1, sheet.getLastColumn());
  var lastRow = Math.min(maxRow, sheet.getLastRow());
  if (lastRow < 1) return 0;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  for (var r = 0; r < lastRow; r++) {
    var rowSet = {};
    for (var c = 0; c < lastCol; c++) {
      var cell = String(values[r][c] || '').trim();
      if (cell) rowSet[cell] = true;
    }
    var allFound = true;
    for (var t = 0; t < TPSO_REQUIRED_HEADER_TOKENS.length; t++) {
      if (!rowSet[TPSO_REQUIRED_HEADER_TOKENS[t]]) { allFound = false; break; }
    }
    if (allFound) return r + 1;
  }
  return 0;
}
