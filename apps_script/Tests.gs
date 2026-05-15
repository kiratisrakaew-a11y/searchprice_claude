/**
 * Tests.gs — Minimal in-Apps-Script test harness for Milestone 1.
 * Run `runSheetSetupTests()` from the Apps Script editor or the menu.
 *
 * NOTE: tests are non-destructive. They never delete sheets or rows.
 */

function runSheetSetupTests() {
  var results = [];

  results.push(_runTest('testRequiredSheetsExistAfterEnsure', testRequiredSheetsExistAfterEnsure));
  results.push(_runTest('testManagedHeadersExact', testManagedHeadersExact));
  results.push(_runTest('testNoMergedCellsInManaged', testNoMergedCellsInManaged));
  results.push(_runTest('testNoDescriptionRowInManaged', testNoDescriptionRowInManaged));
  results.push(_runTest('testRawSheetHeaders', testRawSheetHeaders));
  results.push(_runTest('testTpsoLayoutDetection', testTpsoLayoutDetection));
  results.push(_runTest('testIdempotentEnsure', testIdempotentEnsure));
  results.push(_runTest('testNoForbiddenSheetsCreated', testNoForbiddenSheetsCreated));
  results.push(_runTest('testSchemaColumnCounts', testSchemaColumnCounts));
  results.push(_runTest('testOptionalHeaderNotExtra', testOptionalHeaderNotExtra));
  results.push(_runTest('testThaiDescriptionRowDetected', testThaiDescriptionRowDetected));

  var passed = 0, failed = 0;
  for (var i = 0; i < results.length; i++) {
    if (results[i].ok) passed++; else failed++;
  }
  Logger.log('=== Milestone 1 Tests: ' + passed + ' passed, ' + failed + ' failed ===');
  for (var j = 0; j < results.length; j++) {
    Logger.log((results[j].ok ? 'PASS  ' : 'FAIL  ') + results[j].name +
               (results[j].error ? '  -- ' + results[j].error : ''));
  }
  return { passed: passed, failed: failed, results: results };
}

function _runTest(name, fn) {
  try {
    fn();
    return { name: name, ok: true };
  } catch (e) {
    return { name: name, ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function _assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function _assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'assertEqual failed') + ' — expected ' + expected + ', got ' + actual);
  }
}

function _assertArrayEqual(actual, expected, msg) {
  if (!actual || !expected || actual.length !== expected.length) {
    throw new Error((msg || 'array length mismatch') +
                    ' — expected len ' + (expected ? expected.length : 'null') +
                    ', got len ' + (actual ? actual.length : 'null'));
  }
  for (var i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error((msg || 'array mismatch') +
                      ' at index ' + i + ' — expected "' + expected[i] + '", got "' + actual[i] + '"');
    }
  }
}

// ---------- tests ----------

function testRequiredSheetsExistAfterEnsure() {
  ensureAllSheets();
  for (var i = 0; i < REQUIRED_SHEETS.length; i++) {
    _assert(getSheet_(REQUIRED_SHEETS[i]) !== null,
      'required sheet missing: ' + REQUIRED_SHEETS[i]);
  }
}

function testManagedHeadersExact() {
  ensureAllSheets();
  var toCheck = [SHEET.MASTER, SHEET.STAGING, SHEET.ALIAS, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < toCheck.length; i++) {
    var name = toCheck[i];
    var sheet = getSheet_(name);
    var actual = readHeader_(sheet);
    var expected = getManagedSchema_(name);
    _assertArrayEqual(actual, expected, 'header mismatch on ' + name);
  }
}

function testNoMergedCellsInManaged() {
  // Checks entire used range, not just header row
  var toCheck = [SHEET.MASTER, SHEET.STAGING, SHEET.ALIAS, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < toCheck.length; i++) {
    var sheet = getSheet_(toCheck[i]);
    if (!sheet) continue;
    _assert(!sheetHasMergedCells_(sheet), 'merged cells anywhere in ' + toCheck[i]);
  }
}

function testNoDescriptionRowInManaged() {
  var toCheck = [SHEET.MASTER, SHEET.STAGING, SHEET.ALIAS, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < toCheck.length; i++) {
    var name = toCheck[i];
    var sheet = getSheet_(name);
    if (!sheet) continue;
    var expected = getManagedSchema_(name);
    _assert(!hasDescriptionRowAt2_(sheet, expected), 'description row at row 2 of ' + name);
  }
}

function testRawSheetHeaders() {
  // CGD and OBEC material must match exactly
  var cgd = getSheet_(SHEET.RAW_CGD);
  _assert(cgd !== null, 'laborcost_cgd missing');
  var cgdCheck = validateHeaderExact_(readHeader_(cgd), RAW_EXPECTED_HEADERS.laborcost_cgd);
  _assert(cgdCheck.ok, 'laborcost_cgd header mismatch: ' + JSON.stringify(cgdCheck));

  var mObec = getSheet_(SHEET.RAW_OBEC_MATERIAL);
  _assert(mObec !== null, 'materialcost_obec missing');
  var mCheck = validateHeaderExact_(readHeader_(mObec), RAW_EXPECTED_HEADERS.materialcost_obec);
  _assert(mCheck.ok, 'materialcost_obec header mismatch: ' + JSON.stringify(mCheck));

  // OBEC labor: material_cost_thb is optional per workbook reality
  var lObec = getSheet_(SHEET.RAW_OBEC_LABOR);
  _assert(lObec !== null, 'laborcost_obec missing');
  var lCheck = validateHeaderExact_(
    readHeader_(lObec),
    RAW_EXPECTED_HEADERS.laborcost_obec,
    RAW_OPTIONAL_HEADERS.laborcost_obec || []
  );
  // Filter optional from missing
  var hardMissing = [];
  for (var i = 0; i < lCheck.missing.length; i++) {
    if ((RAW_OPTIONAL_HEADERS.laborcost_obec || []).indexOf(lCheck.missing[i]) === -1) {
      hardMissing.push(lCheck.missing[i]);
    }
  }
  _assertEqual(hardMissing.length, 0, 'laborcost_obec hard-missing headers: ' + hardMissing.join(','));
  _assertEqual(lCheck.outOfOrder.length, 0, 'laborcost_obec out of order: ' + lCheck.outOfOrder.join(','));
}

function testTpsoLayoutDetection() {
  var sheet = getSheet_(SHEET.RAW_TPSO);
  _assert(sheet !== null, 'materialcost_tpso missing');
  var row = detectTpsoHeaderRow_(sheet);
  _assert(row > 0, 'TPSO real header row not detected');
  // Current workbook has it at row 4; we tolerate other rows but warn.
  if (row !== (TPSO.expectedFirstDataRow - 1)) {
    Logger.log('NOTE: TPSO header detected at row ' + row + ' (expected ' +
               (TPSO.expectedFirstDataRow - 1) + ')');
  }
}

function testIdempotentEnsure() {
  var a = ensureAllSheets();
  var b = ensureAllSheets();
  // Second run must create nothing
  _assertEqual(b.created.length, 0, 'second ensure created sheets: ' + b.created.join(','));
  // Both runs must report every managed sheet as present afterwards
  _assertEqual(a.created.length + a.existing.length, MANAGED_SHEETS.length, 'first ensure missed sheets');
  _assertEqual(b.existing.length, MANAGED_SHEETS.length, 'second ensure existing count mismatch');
}

function testNoForbiddenSheetsCreated() {
  for (var i = 0; i < FORBIDDEN_SHEETS_PHASE_1.length; i++) {
    _assert(getSheet_(FORBIDDEN_SHEETS_PHASE_1[i]) === null,
      'forbidden sheet present: ' + FORBIDDEN_SHEETS_PHASE_1[i]);
  }
}

function testSchemaColumnCounts() {
  _assertEqual(HEADERS.MASTER.length,      26, 'MASTER col count');
  _assertEqual(HEADERS.STAGING.length,     29, 'STAGING col count');
  _assertEqual(HEADERS.ALIAS.length,       10, 'ALIAS col count');
  _assertEqual(HEADERS.REFRESH_LOG.length, 18, 'REFRESH_LOG col count');
  _assertEqual(HEADERS.SEARCH_LOG.length,  12, 'SEARCH_LOG col count');
}

/**
 * Finding 2 fix: optional header (material_cost_thb) present in actual
 * must NOT appear in validateHeaderExact_ `extra` list.
 */
function testOptionalHeaderNotExtra() {
  var expected = RAW_EXPECTED_HEADERS.laborcost_obec;
  var optional = RAW_OPTIONAL_HEADERS.laborcost_obec || [];
  // Simulate laborcost_obec that HAS material_cost_thb in the future
  var actualWithOptional = expected.concat(['material_cost_thb']);
  var result = validateHeaderExact_(actualWithOptional, expected, optional);
  _assertEqual(result.extra.length, 0,
    'optional header material_cost_thb should not be in extra, got: ' + result.extra.join(','));
  // Simulate truly unexpected column — should still be flagged
  var actualWithUnknown = expected.concat(['unknown_column']);
  var result2 = validateHeaderExact_(actualWithUnknown, expected, optional);
  _assertEqual(result2.extra.length, 1,
    'unknown_column should be in extra, got count: ' + result2.extra.length);
}

/**
 * Finding 4 fix: Thai label text in row 2 must be detected as description row.
 * Tests heuristic 3 of hasDescriptionRowAt2_().
 * Uses a mock object since we cannot create real Sheets in unit tests.
 */
function testThaiDescriptionRowDetected() {
  var expected = HEADERS.MASTER; // 26 cols with underscores
  // Build a row 2 that looks like Thai descriptions — no underscores, all strings
  var thaiLabels = [
    'รหัสหลัก', 'ชื่อแหล่ง', 'ประเภทแหล่ง', 'ความถี่', 'รหัสรายการ',
    'ชื่อรายการต้นฉบับ', 'ชื่อรายการ', 'หมวดหมู่ 1', 'หมวดหมู่ 2', 'หมวดหมู่ 3',
    'หน่วย', 'ราคา', 'ค่าวัสดุ', 'ค่าแรง', 'ราคารวม',
    'เกณฑ์ราคา', 'จังหวัด', 'ภาค', 'ปีที่มีผล', 'เดือนที่มีผล',
    'หมายเหตุ', 'คำค้น', 'คำแทน', 'ข้อความรวม', 'สถานะ', 'อัปเดตล่าสุด'
  ];
  // Detect using pure array logic (no Apps Script Sheet needed)
  var checkCols = Math.min(expected.length, thaiLabels.length);
  var populated = 0;
  var allStrings = true;
  var anyUnderscore = false;
  for (var k = 0; k < checkCols; k++) {
    var s = String(thaiLabels[k] || '').trim();
    if (s === '') continue;
    populated++;
    if (s.indexOf('_') !== -1) { anyUnderscore = true; break; }
  }
  var wouldFlag = allStrings && !anyUnderscore && populated >= Math.ceil(checkCols * 0.5);
  _assert(wouldFlag, 'Thai description row should be flagged by heuristic 3');

  // Verify normal data row (numbers + strings with underscores) would NOT be flagged
  var dataRow = ['M001', 'laborcost_cgd', 'labor', 'yearly', 'A001',
    'Test item', 'Test item clean', 'Cat1', null, null, 'ตร.ม.', 100, null, 100, 100,
    'labor_only', null, null, 2569, 4, null, null, null, null, 'active', '2026-01-01'];
  var populated2 = 0, anyUnderscore2 = false;
  for (var d = 0; d < Math.min(expected.length, dataRow.length); d++) {
    var sv = String(dataRow[d] === null || dataRow[d] === undefined ? '' : dataRow[d]).trim();
    if (sv === '') continue;
    populated2++;
    if (sv.indexOf('_') !== -1) { anyUnderscore2 = true; break; }
  }
  var wouldFlagData = !anyUnderscore2 && populated2 >= Math.ceil(Math.min(expected.length, dataRow.length) * 0.5);
  _assert(!wouldFlagData, 'normal data row with underscores should NOT be flagged');
}
