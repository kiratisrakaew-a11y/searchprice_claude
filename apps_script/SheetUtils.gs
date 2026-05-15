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

// ---------- Header lookup & row<->object conversion ----------

/**
 * 1-based column index for `headerName`, or 0 if not present.
 */
function getColumnIndex_(sheet, headerName) {
  if (!sheet) return 0;
  var headers = readHeader_(sheet);
  var i = headers.indexOf(headerName);
  return i === -1 ? 0 : i + 1;
}

/** Build an object keyed by header name from a row array. */
function rowToObject_(row, headers) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = (row && i < row.length) ? row[i] : '';
  }
  return obj;
}

/** Build a row array in header order; missing fields become ''. */
function objectToRow_(obj, headers) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var v = obj ? obj[headers[i]] : undefined;
    row.push(v === undefined || v === null ? '' : v);
  }
  return row;
}

// ---------- Safe readers ----------

/** Read every data row (row 2..lastRow) as objects keyed by header. */
function readAllAsObjects_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = readHeader_(sheet);
  if (headers.length === 0) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) out.push(rowToObject_(values[i], headers));
  return out;
}

/** Read a specific block; startRow is 1-based and must be >= 2. */
function readRangeAsObjects_(sheet, startRow, numRows) {
  if (!sheet || numRows <= 0) return [];
  if (startRow < 2) startRow = 2;
  var lastRow = sheet.getLastRow();
  if (startRow > lastRow) return [];
  var rows = Math.min(numRows, lastRow - startRow + 1);
  var headers = readHeader_(sheet);
  if (headers.length === 0) return [];
  var values = sheet.getRange(startRow, 1, rows, headers.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) out.push(rowToObject_(values[i], headers));
  return out;
}

// ---------- Safe writers ----------

/**
 * Append objects to a sheet, mapping each field by header name.
 * Never overwrites existing rows. Returns the number of rows appended.
 */
function appendRowsByHeader_(sheet, objects) {
  if (!sheet) throw new Error('appendRowsByHeader_: sheet is null');
  if (!objects || objects.length === 0) return 0;
  var headers = readHeader_(sheet);
  if (headers.length === 0) throw new Error('appendRowsByHeader_: sheet has no header: ' + sheet.getName());
  var matrix = [];
  for (var i = 0; i < objects.length; i++) matrix.push(objectToRow_(objects[i], headers));
  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, matrix.length, headers.length).setValues(matrix);
  return matrix.length;
}

// ---------- Safe clear ----------

function _assertClearable_(sheet) {
  if (!sheet) throw new Error('clear: sheet is null');
  var name = sheet.getName();
  if (CLEARABLE_SHEETS.indexOf(name) === -1) {
    throw new Error('clear blocked: sheet "' + name + '" is not in CLEARABLE_SHEETS');
  }
}

/**
 * Clear all data rows (row 2..lastRow); header row stays intact.
 * Allow-list guarded — refuses raw sheets and ALIAS_DICTIONARY.
 * @return {number} rows cleared.
 */
function clearDataRows_(sheet) {
  _assertClearable_(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return 0;
  sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  return lastRow - 1;
}

/**
 * Clear rows where predicate(rowObj) returns true; keep the rest.
 * Strategy: read → filter → clear all → rewrite kept rows.
 * @return {{removed:number, kept:number}}
 */
function clearRowsByPredicate_(sheet, predicateFn) {
  _assertClearable_(sheet);
  if (typeof predicateFn !== 'function') throw new Error('clearRowsByPredicate_: predicateFn required');
  var headers = readHeader_(sheet);
  if (headers.length === 0) return { removed: 0, kept: 0 };
  var all = readAllAsObjects_(sheet);
  if (all.length === 0) return { removed: 0, kept: 0 };
  var keep = [];
  var removed = 0;
  for (var i = 0; i < all.length; i++) {
    if (predicateFn(all[i])) removed++;
    else keep.push(all[i]);
  }
  if (removed === 0) return { removed: 0, kept: keep.length };
  clearDataRows_(sheet);
  if (keep.length > 0) appendRowsByHeader_(sheet, keep);
  return { removed: removed, kept: keep.length };
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
