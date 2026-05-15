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
  results.push(_runTest('testNoMergedCellsInManagedHeader', testNoMergedCellsInManagedHeader));
  results.push(_runTest('testNoDescriptionRowInManaged', testNoDescriptionRowInManaged));
  results.push(_runTest('testRawSheetHeaders', testRawSheetHeaders));
  results.push(_runTest('testTpsoLayoutDetection', testTpsoLayoutDetection));
  results.push(_runTest('testIdempotentEnsure', testIdempotentEnsure));
  results.push(_runTest('testNoForbiddenSheetsCreated', testNoForbiddenSheetsCreated));
  results.push(_runTest('testSchemaColumnCounts', testSchemaColumnCounts));

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

function testNoMergedCellsInManagedHeader() {
  var toCheck = [SHEET.MASTER, SHEET.STAGING, SHEET.ALIAS, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < toCheck.length; i++) {
    var sheet = getSheet_(toCheck[i]);
    if (!sheet) continue;
    _assert(!headerHasMergedCells_(sheet), 'merged cells in header of ' + toCheck[i]);
  }
}

function testNoDescriptionRowInManaged() {
  var toCheck = [SHEET.MASTER, SHEET.STAGING, SHEET.ALIAS, SHEET.REFRESH_LOG, SHEET.SEARCH_LOG];
  for (var i = 0; i < toCheck.length; i++) {
    var sheet = getSheet_(toCheck[i]);
    if (!sheet) continue;
    _assert(!hasDescriptionRowAt2_(sheet), 'description row at row 2 of ' + toCheck[i]);
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
