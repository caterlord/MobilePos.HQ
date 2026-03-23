#!/bin/bash

# Sprint 5 store settings regression checks (WP-023/WP-025/WP-026)
# Usage:
#   API_TOKEN=<bearer-token> BRAND_ID=<brand-id> ./test-store-settings-regression.sh
# Optional:
#   API_URL=http://localhost:5125/api API_TOKEN=<token> BRAND_ID=<id> ./test-store-settings-regression.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${API_TOKEN:-}"
BRAND_ID="${BRAND_ID:-}"
TMP_BODY="/tmp/ewhq-store-settings-regression-response-$$.json"

FAILURES=0
HTTP_CODE=""

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}API_TOKEN is not set.${NC}"
  echo "  export API_TOKEN='<access-token>'"
  exit 1
fi

if [ -z "$BRAND_ID" ]; then
  echo -e "${YELLOW}BRAND_ID is not set.${NC}"
  echo "  export BRAND_ID='<brand-id>'"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}curl is required${NC}"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo -e "${RED}jq is required for this regression script${NC}"
  exit 1
fi

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  if [ -n "$body" ]; then
    HTTP_CODE=$(curl -s -o "$TMP_BODY" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL$path" \
      -d "$body")
  else
    HTTP_CODE=$(curl -s -o "$TMP_BODY" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL$path")
  fi
}

pass() {
  echo -e "${GREEN}PASS${NC} $1"
}

warn() {
  echo -e "${YELLOW}WARN${NC} $1"
}

fail() {
  echo -e "${RED}FAIL${NC} $1"
  FAILURES=$((FAILURES + 1))
}

expect_status() {
  local expected="$1"
  local label="$2"
  if [ "$HTTP_CODE" = "$expected" ]; then
    pass "$label (status $HTTP_CODE)"
  else
    fail "$label (status $HTTP_CODE, expected $expected)"
    if [ -f "$TMP_BODY" ]; then
      echo "  Response body:"
      cat "$TMP_BODY"
      echo
    fi
  fi
}

assert_jq() {
  local expression="$1"
  local label="$2"
  if jq -e "$expression" "$TMP_BODY" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label"
    if [ -f "$TMP_BODY" ]; then
      echo "  Response body:"
      cat "$TMP_BODY"
      echo
    fi
  fi
}

extract_value() {
  local expression="$1"
  jq -r "$expression // empty" "$TMP_BODY" 2>/dev/null
}

cleanup_on_exit() {
  rm -f "$TMP_BODY"
}
trap cleanup_on_exit EXIT

echo "Store settings regression checks against $API_URL (brand $BRAND_ID)"
echo "=============================================================="

request "GET" "/store-settings/brand/$BRAND_ID/shops"
expect_status "200" "List settings shops"
assert_jq 'type == "array"' "Shops response is an array"

SHOP_ID=$(extract_value '[.[] | select((.enabled // true) == true) | .shopId] | .[0]')
if [ -z "$SHOP_ID" ]; then
  SHOP_ID=$(extract_value '.[0].shopId')
fi

if [ -z "$SHOP_ID" ]; then
  fail "No shops available for regression checks"
  echo "=============================================================="
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi
pass "Resolved shop fixture (shopId=$SHOP_ID)"

request "GET" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/info"
expect_status "200" "Get store info settings"
assert_jq ".shopId == $SHOP_ID" "Store info response matches selected shop"

INFO_NAME=$(extract_value '.name')
INFO_CURRENCY_CODE=$(extract_value '.currencyCode')
INFO_CURRENCY_SYMBOL=$(extract_value '.currencySymbol')

if [ -n "$INFO_NAME" ] && [ -n "$INFO_CURRENCY_CODE" ] && [ -n "$INFO_CURRENCY_SYMBOL" ]; then
  INFO_PAYLOAD=$(jq -c '{
    name: (.name // ""),
    altName: (.altName // ""),
    description: (.description // ""),
    addressLine1: (.addressLine1 // ""),
    addressLine2: (.addressLine2 // ""),
    city: (.city // ""),
    country: (.country // ""),
    telephone: (.telephone // ""),
    currencyCode: (.currencyCode // ""),
    currencySymbol: (.currencySymbol // ""),
    enabled: (.enabled // true)
  }' "$TMP_BODY")

  request "PUT" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/info" "$INFO_PAYLOAD"
  expect_status "200" "No-op update store info settings"
  assert_jq ".shopId == $SHOP_ID" "Updated store info response matches selected shop"
else
  fail "Skipping store info PUT: required name/currency fields are missing in source data"
fi

request "GET" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/snapshot"
expect_status "200" "Get store settings snapshot"
assert_jq ".shopId == $SHOP_ID" "Snapshot response matches selected shop"

WORKDAY_COUNT=$(extract_value '.workdayEntries | length')
if [ -z "$WORKDAY_COUNT" ]; then
  WORKDAY_COUNT=0
fi

if [ "$WORKDAY_COUNT" -gt 0 ]; then
  WORKDAY_PAYLOAD=$(jq -c '{ entries: (.workdayEntries // []) }' "$TMP_BODY")
  request "PUT" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/workday" "$WORKDAY_PAYLOAD"
  expect_status "200" "No-op update workday schedule"
  assert_jq 'type == "array"' "Workday update response is an array"
else
  warn "Skipping workday PUT: no existing workday entries to replay"
fi

SYSTEM_PARAM_CODE=$(extract_value '.systemParameters[0].paramCode')
SYSTEM_PARAM_DESCRIPTION=$(extract_value '.systemParameters[0].description')
SYSTEM_PARAM_VALUE=$(extract_value '.systemParameters[0].paramValue')
SYSTEM_PARAM_ENABLED=$(extract_value '.systemParameters[0].enabled')

request "GET" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/workday-periods"
expect_status "200" "Get workday periods"
assert_jq 'type == "array"' "Workday periods response is an array"

PERIODS_PAYLOAD=$(jq -c '{ periods: . }' "$TMP_BODY")
request "PUT" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/workday-periods" "$PERIODS_PAYLOAD"
expect_status "200" "No-op replace workday periods"
assert_jq 'type == "array"' "Workday period replace response is an array"

if [ -n "$SYSTEM_PARAM_CODE" ] && [ -n "$SYSTEM_PARAM_DESCRIPTION" ]; then
  if [ "$SYSTEM_PARAM_ENABLED" != "false" ]; then
    SYSTEM_PARAM_ENABLED="true"
  fi

  SYSTEM_PARAM_CODE_URI=$(jq -nr --arg value "$SYSTEM_PARAM_CODE" '$value|@uri')
  SYSTEM_PARAM_PAYLOAD=$(jq -cn \
    --arg description "$SYSTEM_PARAM_DESCRIPTION" \
    --arg paramValue "$SYSTEM_PARAM_VALUE" \
    --argjson enabled "$SYSTEM_PARAM_ENABLED" \
    '{ description: $description, paramValue: $paramValue, enabled: $enabled }')

  request "PUT" "/store-settings/brand/$BRAND_ID/shops/$SHOP_ID/system-parameters/$SYSTEM_PARAM_CODE_URI" "$SYSTEM_PARAM_PAYLOAD"
  expect_status "200" "No-op upsert system parameter"
else
  warn "Skipping system parameter upsert: no existing parameter fixture found"
fi

request "GET" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/metadata"
expect_status "200" "Get table settings metadata"
assert_jq '.tableTypes | type == "array"' "Table metadata includes table types"

TABLE_TYPE_ID=$(extract_value '.tableTypes[0].tableTypeId')
TABLE_PRINTER_ID=$(extract_value '.printers[0].shopPrinterMasterId')

if [ -n "$TABLE_TYPE_ID" ]; then
  TABLE_SECTION_NAME="AUTO_SECTION_${SHOP_ID}_$$"
  CREATE_SECTION_PAYLOAD=$(jq -cn \
    --arg sectionName "$TABLE_SECTION_NAME" \
    '{ sectionName: $sectionName, description: "Automated regression section" }')

  request "POST" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/sections" "$CREATE_SECTION_PAYLOAD"
  expect_status "200" "Create table section"
  assert_jq '.sectionId > 0' "Created section has sectionId"

  CREATED_SECTION_ID=$(extract_value '.sectionId')

  if [ -n "$CREATED_SECTION_ID" ]; then
    TABLE_CODE_SUFFIX=$((RANDOM % 900 + 100))
    TABLE_CODE="A${TABLE_CODE_SUFFIX}"

    if [ -n "$TABLE_PRINTER_ID" ]; then
      TABLE_PRINTER_JSON="$TABLE_PRINTER_ID"
    else
      TABLE_PRINTER_JSON="null"
    fi

    CREATE_TABLE_PAYLOAD=$(jq -cn \
      --arg tableCode "$TABLE_CODE" \
      --argjson sectionId "$CREATED_SECTION_ID" \
      --argjson tableTypeId "$TABLE_TYPE_ID" \
      --argjson shopPrinterMasterId "$TABLE_PRINTER_JSON" \
      '{
        tableCode: $tableCode,
        sectionId: $sectionId,
        tableTypeId: $tableTypeId,
        displayIndex: 1,
        isTakeAway: false,
        seatNum: 4,
        shopPrinterMasterId: $shopPrinterMasterId
      }')

    request "POST" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/tables" "$CREATE_TABLE_PAYLOAD"
    expect_status "200" "Create table"
    assert_jq '.tableId > 0' "Created table has tableId"

    CREATED_TABLE_ID=$(extract_value '.tableId')

    if [ -n "$CREATED_TABLE_ID" ]; then
      UPDATE_TABLE_PAYLOAD=$(jq -cn \
        --arg tableCode "$TABLE_CODE" \
        --argjson sectionId "$CREATED_SECTION_ID" \
        --argjson tableTypeId "$TABLE_TYPE_ID" \
        --argjson shopPrinterMasterId "$TABLE_PRINTER_JSON" \
        '{
          tableCode: $tableCode,
          sectionId: $sectionId,
          tableTypeId: $tableTypeId,
          displayIndex: 2,
          isTakeAway: true,
          seatNum: 5,
          shopPrinterMasterId: $shopPrinterMasterId
        }')

      request "PUT" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/tables/$CREATED_TABLE_ID" "$UPDATE_TABLE_PAYLOAD"
      expect_status "200" "Update table"
      assert_jq '.tableId == '"$CREATED_TABLE_ID"'' "Updated table response matches table id"

      request "DELETE" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/tables/$CREATED_TABLE_ID"
      expect_status "204" "Delete table"
    else
      fail "Skipping table update/delete: table creation did not return tableId"
    fi

    request "DELETE" "/table-settings/brand/$BRAND_ID/shops/$SHOP_ID/sections/$CREATED_SECTION_ID"
    expect_status "204" "Delete table section"
  else
    fail "Skipping table CRUD checks: section creation did not return sectionId"
  fi
else
  warn "Skipping table/section CRUD checks: no table type fixture found"
fi

request "GET" "/store-settings/brand/$BRAND_ID/audit-logs?shopId=$SHOP_ID&limit=20"
expect_status "200" "Get settings audit logs"
assert_jq 'type == "array"' "Settings audit log response is an array"
AUDIT_LOG_COUNT=$(extract_value 'length')
if [ -n "$AUDIT_LOG_COUNT" ] && [ "$AUDIT_LOG_COUNT" -gt 0 ]; then
  assert_jq 'map(.category) | any(. == "STORE_SETTINGS" or . == "TABLE_SETTINGS" or . == "DEVICE_SETTINGS")' "Settings audit categories are present"
else
  warn "Audit logs are empty (expected while DB audit sink is disabled before Azure Log Analytics cutover)"
fi

echo "=============================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Store settings regression checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
exit 1
