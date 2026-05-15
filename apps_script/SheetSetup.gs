/**
 * SheetSetup.gs — Milestone 1 entry points.
 *
 * Responsibilities:
 *  - Ensure managed sheets exist (create with headers if missing).
 *  - Validate structure of every required sheet.
 *  - Verify no forbidden Phase 1 sheets were created.
 *  - Never edit raw source sheets.
 */

/**
 * Create any missing managed sheet using its schema.
 * Never touches raw sheets or existing managed sheets.
 * @return {{created: string[], existing: string[]}}
 */
function ensureAllSheets() {
  var created = [];
  var existing = [];
  for (var i = 0; i < MANAGED_SHEETS.length; i++) {
    var name = MANAGED_SHEETS[i];
    var headers = getManagedSchema_(name); // null for CHECKLIST_2_SCHEMA
    var result = ensureSheet_(name, headers || []);
    if (result.created) created.push(name);
    else existing.push(name);
  }
  return { created: created, existing: existing };
}

/**
 * Validate every required sheet and report results.
 * Read-only; no fixes applied.
 * @return {Object} structured report
 */
function validateAllSheets() {
  var report = {
    timestamp: new Date().toISOString(),
    overall_ok: true,
    sheets: {},
    forbidden_present: [],
    notes: []
  };

  // 1. Required sheets exist
  for (var i = 0; i < REQUIRED_SHEETS.length; i++) {
    var name = REQUIRED_SHEETS[i];
    var sheet = getSheet_(name);
    var entry = {
      exists: !!sheet,
      issues: []
    };
    if (!sheet) {
      entry.issues.push('sheet_missing');
      report.overall_ok = false;
      report.sheets[name] = entry;
      continue;
    }

    // 2. Header / structure checks
    if (name === SHEET.RAW_TPSO) {
      // TPSO special layout — detect dynamic header row
      var tpsoRow = detectTpsoHeaderRow_(sheet);
      entry.tpso_header_row_detected = tpsoRow;
      entry.tpso_header_row_expected = TPSO.expectedFirstDataRow - 1; // row 4
      if (tpsoRow === 0) {
        entry.issues.push('tpso_header_row_not_found');
        report.overall_ok = false;
      } else if (tpsoRow !== (TPSO.expectedFirstDataRow - 1)) {
        report.notes.push(
          'TPSO header detected at row ' + tpsoRow +
          ' (expected ' + (TPSO.expectedFirstDataRow - 1) + ') — script will follow detection.'
        );
      }
    } else if (RAW_SHEETS.indexOf(name) !== -1) {
      // Other raw sources — header row 1, expected list
      var expectedRaw = RAW_EXPECTED_HEADERS[name];
      if (expectedRaw) {
        var actualRaw = readHeader_(sheet);
        var optRaw = RAW_OPTIONAL_HEADERS[name] || [];
        var rawCheck = validateHeaderExact_(actualRaw, expectedRaw, optRaw);
        entry.header_check = rawCheck;
        if (!rawCheck.ok) {
          // Filter optional from both missing and extra before failing
          var hardMissing = [];
          for (var m = 0; m < rawCheck.missing.length; m++) {
            if (optRaw.indexOf(rawCheck.missing[m]) === -1) hardMissing.push(rawCheck.missing[m]);
          }
          // validateHeaderExact_ already excludes optional from extra, but guard here too
          var hardExtra = [];
          for (var mx = 0; mx < rawCheck.extra.length; mx++) {
            if (optRaw.indexOf(rawCheck.extra[mx]) === -1) hardExtra.push(rawCheck.extra[mx]);
          }
          if (hardMissing.length > 0 || rawCheck.outOfOrder.length > 0 || hardExtra.length > 0) {
            entry.issues.push('raw_header_mismatch');
            report.overall_ok = false;
          }
        }
      }
    } else if (name === SHEET.CHECKLIST) {
      // Doc-only sheet — only require existence
      entry.note = 'documentation_only';
    } else {
      // Managed sheet — exact header match + structure rules
      var expected = getManagedSchema_(name);
      var actual = readHeader_(sheet);
      var check = validateHeaderExact_(actual, expected);
      entry.header_check = check;
      entry.column_count_actual = actual.length;
      entry.column_count_expected = expected.length;
      if (!check.ok) {
        entry.issues.push('header_mismatch');
        report.overall_ok = false;
      }
      if (sheetHasMergedCells_(sheet)) {
        entry.issues.push('merged_cells_in_sheet');
        report.overall_ok = false;
      }
      if (hasDescriptionRowAt2_(sheet, expected)) {
        entry.issues.push('description_row_at_row_2');
        report.overall_ok = false;
      }
    }

    report.sheets[name] = entry;
  }

  // 3. Forbidden sheets must not exist (script-created)
  for (var f = 0; f < FORBIDDEN_SHEETS_PHASE_1.length; f++) {
    if (getSheet_(FORBIDDEN_SHEETS_PHASE_1[f])) {
      report.forbidden_present.push(FORBIDDEN_SHEETS_PHASE_1[f]);
      report.overall_ok = false;
    }
  }

  return report;
}

/**
 * Menu entry: ensure + validate, log summary to Logger and toast user.
 * @return {Object} validation report
 */
function runMilestone1Check() {
  var ensureResult = ensureAllSheets();
  var report = validateAllSheets();

  Logger.log('=== Milestone 1 — Sheet Setup & Schema Guard ===');
  Logger.log('Sheets created: ' + JSON.stringify(ensureResult.created));
  Logger.log('Sheets already present: ' + JSON.stringify(ensureResult.existing));
  Logger.log('Overall OK: ' + report.overall_ok);
  Logger.log('Forbidden sheets present: ' + JSON.stringify(report.forbidden_present));
  Logger.log('Notes: ' + JSON.stringify(report.notes));
  Logger.log('Per-sheet detail:');
  Logger.log(JSON.stringify(report.sheets, null, 2));

  try {
    SpreadsheetApp.getActive().toast(
      report.overall_ok ? 'Milestone 1 check: PASS' : 'Milestone 1 check: ISSUES (see logs)',
      'Phase 1 Admin',
      5
    );
  } catch (e) {
    // toast may fail outside spreadsheet context; ignore
  }

  return { ensureResult: ensureResult, report: report };
}
