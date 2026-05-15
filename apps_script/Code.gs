/**
 * Code.gs — Entry point. Wires the spreadsheet menu.
 * Milestone 1 exposes sheet setup actions only.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Phase 1 Admin')
    .addItem('Run Milestone 1 Check (Ensure + Validate)', 'runMilestone1Check')
    .addItem('Validate Sheets Only (read-only)', 'menu_validateAllSheets_')
    .addSeparator()
    .addItem('Run Sheet Setup Tests', 'runSheetSetupTests')
    .addToUi();
}

function menu_validateAllSheets_() {
  var report = validateAllSheets();
  Logger.log(JSON.stringify(report, null, 2));
  try {
    SpreadsheetApp.getActive().toast(
      report.overall_ok ? 'Validate: PASS' : 'Validate: ISSUES (see logs)',
      'Phase 1 Admin',
      5
    );
  } catch (e) { /* noop */ }
  return report;
}
