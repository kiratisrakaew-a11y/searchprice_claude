/**
 * Utils.gs — Cross-cutting utilities used by business modules.
 * No spreadsheet I/O here (see SheetUtils.gs for that).
 * No business logic (mapping/normalize/validate) — only primitives.
 */

// ---------- Text ----------

/**
 * Normalize a text value for comparison/search keys.
 * - lowercase
 * - trim
 * - collapse internal whitespace to single space
 * - Unicode NFC (Thai-safe)
 * @param {*} s
 * @return {string}
 */
function normalizeText_(s) {
  if (s === null || s === undefined) return '';
  var t = String(s);
  t = t.toLowerCase();
  t = t.replace(/\s+/g, ' ').trim();
  if (typeof t.normalize === 'function') {
    try { t = t.normalize('NFC'); } catch (e) { /* older runtime fallback */ }
  }
  return t;
}

// ---------- Number ----------

/**
 * Parse a value into a number.
 * Returns null for null/undefined/''/non-numeric.
 * Accepts strings with thousand-separator commas: "1,234.5" → 1234.5.
 * @param {*} v
 * @return {?number}
 */
function parseNumber_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).replace(/,/g, '').trim();
  if (s === '') return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}

// ---------- Date / Timestamp ----------

/** ISO 8601 UTC string for "now". */
function nowIso_() {
  return new Date().toISOString();
}

/** Compact UTC stamp `YYYYMMDDHHmmss` for use inside IDs. */
function nowCompact_() {
  var d = new Date();
  function p(n) { return n < 10 ? '0' + n : String(n); }
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
         p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
}

/**
 * Parse arbitrary value into Date, or null.
 * Accepts Date, ISO string, epoch ms number.
 */
function parseDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v === null || v === undefined || v === '') return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ---------- Hash ----------

/**
 * SHA-1 hex digest of a string.
 * Uses Apps Script Utilities.computeDigest; falls back to a simple polyfill
 * only when running outside Apps Script (unit-test eval, etc.).
 */
function sha1Hex_(s) {
  var str = String(s == null ? '' : s);
  if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str, Utilities.Charset.UTF_8);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      var h = b.toString(16);
      hex += h.length === 1 ? '0' + h : h;
    }
    return hex;
  }
  // Outside Apps Script (local node-based tests only) — use Node crypto if available.
  if (typeof require === 'function') {
    try {
      var crypto = require('crypto');
      return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
    } catch (e) { /* fall through */ }
  }
  throw new Error('sha1Hex_: no crypto provider available');
}

// ---------- IDs ----------

/**
 * Short source abbreviation. Falls back to lowercased name on unknown source.
 */
function _sourceAbbr_(sourceName) {
  if (sourceName && SOURCE_ABBR[sourceName]) return SOURCE_ABBR[sourceName];
  return String(sourceName == null ? 'unknown' : sourceName).toLowerCase();
}

/**
 * Deterministic master_id.
 * Hash key: normalized (source|item_code|item_name|unit).
 * Same inputs always return the same id, supporting "replace only rows for
 * updated source" without breaking foreign references.
 *
 * @param {string} sourceName
 * @param {*} itemCode
 * @param {*} itemName
 * @param {*} unit
 * @return {string}
 */
function makeMasterId_(sourceName, itemCode, itemName, unit) {
  var key = [
    normalizeText_(sourceName),
    normalizeText_(itemCode),
    normalizeText_(itemName),
    normalizeText_(unit)
  ].join('|');
  var h = sha1Hex_(key).substring(0, 8);
  return 'M_' + _sourceAbbr_(sourceName) + '_' + h;
}

/**
 * Staging id. Unique per row within a refresh batch.
 * @param {string} sourceName
 * @param {string} batchTs  compact UTC stamp shared by the whole batch
 * @param {number} seq
 */
function makeStagingId_(sourceName, batchTs, seq) {
  var ts = batchTs || nowCompact_();
  var n = (seq == null ? 0 : seq) | 0;
  var pad = '000000' + n;
  return 'S_' + _sourceAbbr_(sourceName) + '_' + ts + '_' + pad.substring(pad.length - 6);
}

/** Refresh-log row id. */
function makeLogId_() {
  return 'LOG_' + nowCompact_() + '_' + _rand4_();
}

/** Search-log row id. */
function makeSearchId_() {
  return 'SR_' + nowCompact_() + '_' + _rand4_();
}

function _rand4_() {
  var n = Math.floor(Math.random() * 0x10000);
  var h = n.toString(16);
  while (h.length < 4) h = '0' + h;
  return h;
}

// ---------- Result / Error objects ----------

/**
 * Standard error object. Code is a stable string identifier; message is
 * human-readable; context is optional structured detail.
 */
function makeError_(code, message, context) {
  return {
    error: true,
    code: code || 'UNKNOWN',
    message: message || '',
    context: context === undefined ? null : context,
    timestamp: nowIso_()
  };
}

/** Wrap a successful payload. */
function makeOk_(data) {
  return { ok: true, data: data === undefined ? null : data, error: null };
}

/**
 * Wrap a failure. Accepts a string, a thrown Error, or an existing makeError_
 * result; always produces the same shape.
 */
function makeFail_(errorOrMessage) {
  var err;
  if (errorOrMessage && errorOrMessage.error === true && errorOrMessage.code) {
    err = errorOrMessage;
  } else if (errorOrMessage instanceof Error) {
    err = makeError_('EXCEPTION', errorOrMessage.message || String(errorOrMessage), null);
  } else if (typeof errorOrMessage === 'string') {
    err = makeError_('FAIL', errorOrMessage, null);
  } else {
    err = makeError_('FAIL', 'unspecified failure', errorOrMessage || null);
  }
  return { ok: false, data: null, error: err };
}
