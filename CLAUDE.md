# CLAUDE.md

## BOQ Price Search Project - Claude Operating Rules

This repository is for a Phase 1 Google Sheets + Google Apps Script WebApp used to build and search a BOQ / construction / service / material price reference database.

This file is the primary instruction file for Claude / Claude Code.

Claude must read all files in `/docs` before implementing or modifying code.

Claude must not start coding immediately. First summarize:

1. workbook schema understanding,
2. raw source mapping understanding,
3. TPSO API update flow,
4. planned Apps Script modules,
5. safety boundaries,
6. tests to be executed.

If any requirement conflicts with the workbook `database_with_checklist_3.xlsx` or the documents in `/docs`, Claude must stop and report the conflict before editing code.

## Source of Truth Order

When there is ambiguity, follow this order:

1. `CLAUDE.md`
2. `/docs/03A_RAW_SOURCE_MAPPING.md`
3. `/docs/08_TPSO_API_SPEC.md`
4. `/docs/03_DATA_SCHEMA.md`
5. `/docs/02_REQUIREMENTS.md`
6. `/docs/05_WORKFLOW.md`
7. `/docs/06_APPS_SCRIPT_SPEC.md`
8. `/docs/07_MATCHING_LOGIC.md`
9. `/docs/08_GEMINI_API_BOUNDARY.md`
10. `/docs/09_TESTING_CHECKLIST.md`
11. `/docs/10_CLAUDE_INSTRUCTIONS.md`

## Non-Negotiable Rules

1. Do not change the confirmed Phase 1 architecture without asking.
2. Do not rename sheets or columns unless explicitly instructed.
3. Do not add features outside Phase 1.
4. Do not let the WebApp write to raw source sheets, `STAGING_NORMALIZED`, or `MASTER_PRICE_DATABASE`.
5. Do not use Gemini as the Phase 1 search engine.
6. Do not auto-approve or auto-reject prices.
7. Do not implement `COMPARISON_LOG` in Phase 1.
8. Do not implement login, dashboard, admin page, approval workflow, export, or full role-based permission in Phase 1.
9. Do not hardcode API keys or credentials.
10. Do not delete or replace `MASTER_PRICE_DATABASE` data before validation passes.
11. Do not rebuild the entire `MASTER_PRICE_DATABASE` unnecessarily. Replace only rows for the updated source.
12. Do not auto-add aliases directly to `ALIAS_DICTIONARY` without review.
13. Do not guess raw column mapping. Use `/docs/03A_RAW_SOURCE_MAPPING.md`.
14. Do not guess TPSO API behavior. Use `/docs/08_TPSO_API_SPEC.md`.

## Required Documentation

Claude must follow these documents:

- `/docs/01_PROJECT_OVERVIEW.md`
- `/docs/02_REQUIREMENTS.md`
- `/docs/03_DATA_SCHEMA.md`
- `/docs/03A_RAW_SOURCE_MAPPING.md`
- `/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md`
- `/docs/05_WORKFLOW.md`
- `/docs/06_APPS_SCRIPT_SPEC.md`
- `/docs/07_MATCHING_LOGIC.md`
- `/docs/08_TPSO_API_SPEC.md`
- `/docs/08_GEMINI_API_BOUNDARY.md`
- `/docs/09_TESTING_CHECKLIST.md`
- `/docs/10_CLAUDE_INSTRUCTIONS.md`

## Workbook Authority

The workbook `database_with_checklist_3.xlsx` is the rawdata reference for source sheet structure.

Important workbook facts:

- `materialcost_tpso` uses a metadata area before the real API response header.
- `materialcost_tpso` real response header is expected at row 4 in the current workbook layout.
- Scripts must still detect the real TPSO header instead of hardcoding row 4 only.
- Some raw sheets contain columns that are intentionally ignored for Phase 1 mapping.
- Missing control sheets should be created by the script using the schema in `/docs/03_DATA_SCHEMA.md`.

## Development Style

- Use header-name lookup instead of hardcoded column numbers whenever possible.
- Keep modules separated by responsibility.
- Use safe error handling.
- Log refresh/process outcomes in `REFRESH_LOG`.
- Log search behavior in `SEARCH_LOG`.
- Keep destructive operations guarded by validation.
- Return structured objects between Apps Script backend and WebApp frontend.
- Keep user-facing messages readable.

## Conflict Handling

If requirements conflict, Claude must stop and report the conflict. Do not guess.

If workbook schema differs from these documents, Claude must report the mismatch before changing anything.

If implementation requires a choice that is not specified, Claude must either:

1. choose the safest Phase 1 option and document the assumption, or
2. stop and ask for clarification if the choice could affect data integrity.
