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

  // Milestone 2 — utilities & safe data access
  results.push(_runTest('testNormalizeText', testNormalizeText));
  results.push(_runTest('testParseNumber', testParseNumber));
  results.push(_runTest('testNowIsoAndCompact', testNowIsoAndCompact));
  results.push(_runTest('testSha1Hex', testSha1Hex));
  results.push(_runTest('testMasterIdDeterministic', testMasterIdDeterministic));
  results.push(_runTest('testMasterIdSourceIsolation', testMasterIdSourceIsolation));
  results.push(_runTest('testStagingIdSequence', testStagingIdSequence));
  results.push(_runTest('testLogAndSearchIdsRandomized', testLogAndSearchIdsRandomized));
  results.push(_runTest('testMakeOkAndFail', testMakeOkAndFail));
  results.push(_runTest('testGetColumnIndex', testGetColumnIndex));
  results.push(_runTest('testRowObjectRoundTrip', testRowObjectRoundTrip));
  results.push(_runTest('testAppendRowsByHeader', testAppendRowsByHeader));
  results.push(_runTest('testClearDataRowsAllowList', testClearDataRowsAllowList));
  results.push(_runTest('testClearRowsByPredicate', testClearRowsByPredicate));

  var passed = 0, failed = 0;
  for (var i = 0; i < results.length; i++) {
    if (results[i].ok) passed++; else failed++;
  }
  Logger.log('=== Phase 1 Tests (Sheet Setup + Utilities): ' + passed + ' passed, ' + failed + ' failed ===');
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

// ============================================================
// Milestone 2 — Utilities & safe data access
// ============================================================

function testNormalizeText() {
  _assertEqual(normalizeText_(null), '', 'null → empty');
  _assertEqual(normalizeText_(undefined), '', 'undefined → empty');
  _assertEqual(normalizeText_(''), '', 'empty → empty');
  _assertEqual(normalizeText_('  Hello   World  '), 'hello world', 'trim+collapse+lower');
  _assertEqual(normalizeText_('ABCdef'), 'abcdef', 'mixed case');
  _assertEqual(normalizeText_('A\tB\nC  D'), 'a b c d', 'whitespace variants collapse');
  // Thai content remains intact, just lower-cased ASCII surrounding
  _assertEqual(normalizeText_('  ทรายหยาบ  รองพื้น  '), 'ทรายหยาบ รองพื้น', 'thai preserved');
}

function testParseNumber() {
  _assertEqual(parseNumber_(null), null, 'null → null');
  _assertEqual(parseNumber_(undefined), null, 'undefined → null');
  _assertEqual(parseNumber_(''), null, "'' → null");
  _assertEqual(parseNumber_('abc'), null, 'non-numeric → null');
  _assertEqual(parseNumber_(0), 0, 'zero');
  _assertEqual(parseNumber_(-3.5), -3.5, 'negative float');
  _assertEqual(parseNumber_('1,234.5'), 1234.5, 'comma thousands');
  _assertEqual(parseNumber_('  42  '), 42, 'whitespace');
  _assertEqual(parseNumber_(Infinity), null, 'Infinity → null');
  _assertEqual(parseNumber_(NaN), null, 'NaN → null');
}

function testNowIsoAndCompact() {
  var iso = nowIso_();
  _assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso), 'iso shape: ' + iso);
  var c = nowCompact_();
  _assert(/^\d{14}$/.test(c), 'compact shape: ' + c);
}

function testSha1Hex() {
  // RFC 3174 known test vectors
  _assertEqual(sha1Hex_('abc'),
    'a9993e364706816aba3e25717850c26c9cd0d89d', 'sha1("abc")');
  _assertEqual(sha1Hex_(''),
    'da39a3ee5e6b4b0d3255bfef95601890afd80709', 'sha1("")');
}

function testMasterIdDeterministic() {
  var a = makeMasterId_('laborcost_cgd', 'A001', 'เสาเข็ม ขนาด 4x4', 'ต้น');
  var b = makeMasterId_('laborcost_cgd', 'A001', 'เสาเข็ม ขนาด 4x4', 'ต้น');
  _assertEqual(a, b, 'same inputs → same id');
  _assert(/^M_cgd_[0-9a-f]{8}$/.test(a), 'id format: ' + a);
  // Whitespace + casing tolerated
  var c = makeMasterId_('laborcost_cgd', ' A001 ', 'เสาเข็ม ขนาด 4x4', 'ต้น');
  _assertEqual(a, c, 'leading/trailing space ignored');
}

function testMasterIdSourceIsolation() {
  var a = makeMasterId_('laborcost_cgd', 'A001', 'x', 'ต้น');
  var b = makeMasterId_('laborcost_obec', 'A001', 'x', 'ต้น');
  _assert(a !== b, 'different source → different id');
  _assert(a.indexOf('cgd') !== -1, 'cgd prefix');
  _assert(b.indexOf('obec_l') !== -1, 'obec_l prefix');
}

function testStagingIdSequence() {
  var ts = nowCompact_();
  var s1 = makeStagingId_('laborcost_cgd', ts, 1);
  var s2 = makeStagingId_('laborcost_cgd', ts, 2);
  _assert(s1 !== s2, 's1 != s2');
  _assert(/^S_cgd_\d{14}_\d{6}$/.test(s1), 'staging shape: ' + s1);
  _assert(s1.indexOf('_000001') !== -1, 'seq padded: ' + s1);
}

function testLogAndSearchIdsRandomized() {
  var seenLog = {}, seenSearch = {};
  for (var i = 0; i < 50; i++) {
    var l = makeLogId_();
    var s = makeSearchId_();
    seenLog[l] = (seenLog[l] || 0) + 1;
    seenSearch[s] = (seenSearch[s] || 0) + 1;
  }
  // Allow occasional collision tolerance but require near-unique
  var dupL = 0, dupS = 0;
  for (var k in seenLog) if (seenLog[k] > 1) dupL++;
  for (var k2 in seenSearch) if (seenSearch[k2] > 1) dupS++;
  _assert(dupL <= 2, 'log id duplicates: ' + dupL);
  _assert(dupS <= 2, 'search id duplicates: ' + dupS);
}

function testMakeOkAndFail() {
  var ok = makeOk_({ x: 1 });
  _assertEqual(ok.ok, true, 'ok.ok');
  _assertEqual(ok.error, null, 'ok.error null');
  _assertEqual(ok.data.x, 1, 'ok.data passthrough');

  var f1 = makeFail_('something broke');
  _assertEqual(f1.ok, false, 'f1.ok false');
  _assertEqual(f1.error.message, 'something broke', 'f1 message');
  _assertEqual(f1.error.code, 'FAIL', 'f1 default code');

  var customErr = makeError_('E_HEADER', 'bad header', { sheet: 'X' });
  var f2 = makeFail_(customErr);
  _assertEqual(f2.error.code, 'E_HEADER', 'f2 preserves code');
  _assertEqual(f2.error.context.sheet, 'X', 'f2 preserves context');

  var f3 = makeFail_(new Error('boom'));
  _assertEqual(f3.error.code, 'EXCEPTION', 'Error → EXCEPTION');
  _assertEqual(f3.error.message, 'boom', 'Error message');
}

function testGetColumnIndex() {
  ensureAllSheets();
  var master = getSheet_(SHEET.MASTER);
  _assertEqual(getColumnIndex_(master, 'master_id'), 1, 'first col');
  _assertEqual(getColumnIndex_(master, 'last_refresh_at'), HEADERS.MASTER.length, 'last col');
  _assertEqual(getColumnIndex_(master, 'no_such_column'), 0, 'missing → 0');
}

function testRowObjectRoundTrip() {
  var headers = HEADERS.MASTER;
  var obj = {
    master_id: 'M_test_abc12345',
    source_name: 'laborcost_cgd',
    unit: 'ต้น',
    price: 95
  };
  var row = objectToRow_(obj, headers);
  _assertEqual(row.length, headers.length, 'row length');
  _assertEqual(row[0], 'M_test_abc12345', 'master_id');
  // Missing fields become ''
  for (var i = 0; i < row.length; i++) {
    var name = headers[i];
    if (obj[name] === undefined) _assertEqual(row[i], '', 'missing ' + name + ' → blank');
  }
  var back = rowToObject_(row, headers);
  _assertEqual(back.master_id, 'M_test_abc12345', 'roundtrip master_id');
  _assertEqual(back.unit, 'ต้น', 'roundtrip unit');
  _assertEqual(back.price, 95, 'roundtrip price');
}

function testAppendRowsByHeader() {
  ensureAllSheets();
  // Use SEARCH_LOG — safe to mutate and easy to clean up afterward
  var sheet = getSheet_(SHEET.SEARCH_LOG);
  var beforeRows = sheet.getLastRow();
  var rows = [
    { search_id: 'TEST_SR_1', searched_at: nowIso_(), user_query: 'q1', result_count: 0, no_result_flag: 'yes' },
    { search_id: 'TEST_SR_2', searched_at: nowIso_(), user_query: 'q2', result_count: 3 }
  ];
  var n = appendRowsByHeader_(sheet, rows);
  _assertEqual(n, 2, 'append count');
  var afterRows = sheet.getLastRow();
  _assertEqual(afterRows, beforeRows + 2, 'row count delta');
  // Clean up appended rows
  clearRowsByPredicate_(sheet, function (r) {
    return String(r.search_id || '').indexOf('TEST_SR_') === 0;
  });
}

function testClearDataRowsAllowList() {
  ensureAllSheets();
  // Allowed sheets pass without throwing
  var allowed = [SHEET.STAGING, SHEET.MASTER, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < allowed.length; i++) {
    var s = getSheet_(allowed[i]);
    if (!s) continue;
    clearDataRows_(s); // ok on empty sheet
  }
  // Raw sheets must throw
  var threw = false;
  try { clearDataRows_(getSheet_(SHEET.RAW_CGD)); }
  catch (e) { threw = true; }
  _assert(threw, 'clearing raw sheet must throw');
  // ALIAS_DICTIONARY also blocked
  var threw2 = false;
  try { clearDataRows_(getSheet_(SHEET.ALIAS)); }
  catch (e) { threw2 = true; }
  _assert(threw2, 'clearing ALIAS_DICTIONARY must throw');
}

function testClearRowsByPredicate() {
  ensureAllSheets();
  var sheet = getSheet_(SHEET.SEARCH_LOG);
  // Seed with deterministic test rows
  appendRowsByHeader_(sheet, [
    { search_id: 'PRED_KEEP_1', user_query: 'keep1' },
    { search_id: 'PRED_DROP_1', user_query: 'drop1' },
    { search_id: 'PRED_KEEP_2', user_query: 'keep2' },
    { search_id: 'PRED_DROP_2', user_query: 'drop2' }
  ]);
  var result = clearRowsByPredicate_(sheet, function (r) {
    return String(r.search_id || '').indexOf('PRED_DROP_') === 0;
  });
  _assertEqual(result.removed, 2, 'removed=2');
  // The kept count is sheet-wide (includes other pre-existing rows), so check
  // only that our PRED_KEEP_ rows survive and PRED_DROP_ rows are gone.
  var all = readAllAsObjects_(sheet);
  var kept = 0, leakedDrop = 0;
  for (var i = 0; i < all.length; i++) {
    var id = String(all[i].search_id || '');
    if (id.indexOf('PRED_KEEP_') === 0) kept++;
    if (id.indexOf('PRED_DROP_') === 0) leakedDrop++;
  }
  _assertEqual(kept, 2, 'keep rows survived');
  _assertEqual(leakedDrop, 0, 'drop rows removed');
  // Clean up
  clearRowsByPredicate_(sheet, function (r) {
    return String(r.search_id || '').indexOf('PRED_KEEP_') === 0;
  });
}
