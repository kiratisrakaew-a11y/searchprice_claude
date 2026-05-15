# 08 TPSO API Spec

## Purpose

This document defines how Apps Script must update the `materialcost_tpso` sheet using the TPSO monthly material price API.

TPSO API is used only for refreshing the raw `materialcost_tpso` sheet. It must not write directly into `MASTER_PRICE_DATABASE`.

## API Endpoint

Base URL:

```text
https://index-api.tpso.go.th
```

Endpoint:

```text
POST /OpenApi/CmiPrice/Month
```

Full URL:

```text
https://index-api.tpso.go.th/OpenApi/CmiPrice/Month
```

## Request Parameters

The API request body uses JSON:

```json
{
  "year": 2567,
  "month": 3,
  "type": 14
}
```

Required fields:

| Field | Meaning | Source in Sheet |
|---|---|---|
| `year` | Thai Buddhist calendar year used by TPSO API | `materialcost_tpso` row 2 under `year` |
| `month` | month number 1-12 | `materialcost_tpso` row 2 under `month` |
| `type` | TPSO material/category type code | `materialcost_tpso` row 2 under `type` |

## `materialcost_tpso` Sheet Layout

The sheet must use this layout:

```text
Row 1: year | month | type
Row 2: request parameter values, for example 2569 | 4 | 10
Row 3: blank
Row 4: API response headers
Row 5 onward: API response data
```

The script must preserve this layout.

## Expected Response Fields

The API response data is expected to include these fields:

- `id`
- `type`
- `typeName`
- `commodityCode`
- `commodityNameTH`
- `unitName`
- `curMonth`
- `curYear`
- `priceCur`
- `priceVAT`
- `createdAt`

These fields must be written as the response header row in `materialcost_tpso`.

## Response-to-Raw Sheet Rules

On successful API response:

1. Validate that the response contains at least one data row.
2. Validate required fields.
3. Clear only the old API response area, not the row 1-2 request parameter area.
4. Keep row 3 blank.
5. Write response headers to row 4.
6. Write response data from row 5 onward.
7. Then run TPSO normalization and validation.

## Raw-to-Master Mapping

Use `/docs/03A_RAW_SOURCE_MAPPING.md`.

Important mapping:

| API Field | Master/Staging Field |
|---|---|
| `commodityCode` | `item_code` |
| `commodityNameTH` | `item_name_original`, `item_name_clean` |
| `unitName` | `unit` |
| `priceCur` | `price`, `material_cost`, `total_cost` |
| `curYear` | `effective_year` |
| `curMonth` | `effective_month` |
| `typeName` | `category_level_3`, `region` |

## Failure Handling

If API call fails:

- Do not clear `materialcost_tpso`.
- Do not change `MASTER_PRICE_DATABASE`.
- Keep existing TPSO master rows.
- Write `REFRESH_LOG` with `failed`.

If API returns 0 rows:

- Treat as failure or `blocked_by_validation`.
- Do not replace `materialcost_tpso`.
- Do not change master.
- Write `REFRESH_LOG`.

If response fields are missing:

- Stop.
- Do not guess mapping.
- Do not update master.
- Write `REFRESH_LOG` with clear error.

## Apps Script Fetch Requirements

Use `UrlFetchApp.fetch` with:

- `method` = `post`
- `contentType` = `application/json`
- `payload` = JSON string
- `muteHttpExceptions` = `true`

Do not hardcode credentials.

If the public API does not require a key, no key is needed.

## Safe Update Sequence

```text
validate request params
→ call API
→ validate HTTP status
→ parse JSON
→ validate response array and required fields
→ replace materialcost_tpso raw API response area
→ normalize TPSO to STAGING_NORMALIZED
→ validate staging
→ replace only materialcost_tpso rows in MASTER_PRICE_DATABASE
→ write REFRESH_LOG
```

Never delete old TPSO rows from `MASTER_PRICE_DATABASE` before staging validation passes.
