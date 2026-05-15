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

  // Extra (actual not in expected)
  for (var k = 0; k < actual.length; k++) {
    if (expectedSet[actual[k]] === undefined) extra.push(actual[k]);
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
 * Check if any merged cells exist within the header range (row 1, cols 1..n).
 * @return {boolean} true if a merge was found.
 */
function headerHasMergedCells_(sheet) {
  if (!sheet) return false;
  var lastCol = Math.max(1, sheet.getLastColumn());
  var ranges = sheet.getRange(1, 1, 1, lastCol).getMergedRanges();
  return ranges && ranges.length > 0;
}

/**
 * Heuristic: detect a "field description row" — row 2 echoing or describing
 * the header. We flag if row 2 equals row 1 verbatim, or if row 2 contains
 * the exact word "description" / "คำอธิบาย" in any cell.
 */
function hasDescriptionRowAt2_(sheet) {
  if (!sheet) return false;
  if (sheet.getLastRow() < 2) return false;
  var lastCol = Math.max(1, sheet.getLastColumn());
  var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

  // Exact echo
  var echo = true;
  for (var i = 0; i < lastCol; i++) {
    if (String(row1[i]).trim() !== String(row2[i]).trim()) { echo = false; break; }
  }
  if (echo) return true;

  // Description keyword
  for (var j = 0; j < lastCol; j++) {
    var v = String(row2[j] || '').toLowerCase();
    if (v.indexOf('description') !== -1 || v.indexOf('คำอธิบาย') !== -1) return true;
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
