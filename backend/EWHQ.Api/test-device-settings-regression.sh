#!/bin/bash

# Sprint 5 device settings regression checks (WP-024)
# Usage:
#   AUTH0_TOKEN=<bearer-token> BRAND_ID=<brand-id> ./test-device-settings-regression.sh
# Optional:
#   API_URL=http://localhost:5125/api AUTH0_TOKEN=<token> BRAND_ID=<id> ./test-device-settings-regression.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${AUTH0_TOKEN:-}"
BRAND_ID="${BRAND_ID:-}"
TMP_BODY="/tmp/ewhq-device-settings-regression-response-$$.json"

FAILURES=0
HTTP_CODE=""
SHOP_ID=""
TERMINAL_MODEL_ID=""
TERMINAL_ID=""
TERMINAL_CASH_DRAWER_CODE=""
PRINTER1_ID=""
PRINTER2_ID=""
CASH_DRAWER_CODE=""

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}AUTH0_TOKEN is not set.${NC}"
  echo "  export AUTH0_TOKEN='<access-token>'"
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

urlencode() {
  jq -nr --arg value "$1" '$value|@uri'
}

cleanup_on_exit() {
  if [ -n "$TERMINAL_ID" ] && [ -n "$SHOP_ID" ]; then
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals/$TERMINAL_ID" >/dev/null 2>&1 || true
  fi

  if [ -n "$PRINTER2_ID" ] && [ -n "$SHOP_ID" ]; then
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers/$PRINTER2_ID" >/dev/null 2>&1 || true
  fi

  if [ -n "$PRINTER1_ID" ] && [ -n "$SHOP_ID" ]; then
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers/$PRINTER1_ID" >/dev/null 2>&1 || true
  fi

  if [ -n "$CASH_DRAWER_CODE" ] && [ -n "$SHOP_ID" ]; then
    local encoded_drawer
    encoded_drawer=$(urlencode "$CASH_DRAWER_CODE")
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/cash-drawers/$encoded_drawer" >/dev/null 2>&1 || true
  fi

  rm -f "$TMP_BODY"
}
trap cleanup_on_exit EXIT

echo "Device settings regression checks against $API_URL (brand $BRAND_ID)"
echo "==============================================================="

request "GET" "/store-settings/brand/$BRAND_ID/shops"
expect_status "200" "List shops"
assert_jq 'type == "array"' "Shops response is an array"

SHOP_ID=$(extract_value '[.[] | select((.enabled // true) == true) | .shopId] | .[0]')
if [ -z "$SHOP_ID" ]; then
  SHOP_ID=$(extract_value '.[0].shopId')
fi

if [ -z "$SHOP_ID" ]; then
  fail "No shop fixture available for device settings checks"
  echo "==============================================================="
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi
pass "Resolved shop fixture (shopId=$SHOP_ID)"

request "GET" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminal-models"
expect_status "200" "List terminal models"
assert_jq 'type == "array"' "Terminal model response is an array"

TERMINAL_MODEL_ID=$(extract_value '.[0].deviceTerminalModelId')
if [ -z "$TERMINAL_MODEL_ID" ]; then
  fail "No enabled terminal model found; cannot verify terminal create/update flow"
  echo "==============================================================="
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi
pass "Resolved terminal model fixture (modelId=$TERMINAL_MODEL_ID)"

SUFFIX=$(date +%s)
TERMINAL_CODE="E2ET${SUFFIX}"
PRINTER1_NAME="E2E Printer ${SUFFIX}"
PRINTER2_NAME="E2E Redirect ${SUFFIX}"
DRAWER_NAME="E2E Drawer ${SUFFIX}"

# Terminal create with cash-register linkage
TERMINAL_PAYLOAD=$(cat <<JSON
{
  "posCode": "$TERMINAL_CODE",
  "posIpAddress": "10.0.0.10",
  "isServer": true,
  "isCashRegister": true,
  "cashRegisterCode": "",
  "deviceTerminalModelId": $TERMINAL_MODEL_ID,
  "resolutionWidth": 1280,
  "resolutionHeight": 800
}
JSON
)

request "POST" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals" "$TERMINAL_PAYLOAD"
expect_status "200" "Create terminal"
assert_jq '.terminalId > 0' "Terminal id returned"
assert_jq '.isCashRegister == true' "Terminal cash-register flag persisted"
TERMINAL_ID=$(extract_value '.terminalId')
TERMINAL_CASH_DRAWER_CODE=$(extract_value '.cashRegisterCode')

if [ -n "$TERMINAL_CASH_DRAWER_CODE" ]; then
  pass "Terminal auto-linked cash drawer (code=$TERMINAL_CASH_DRAWER_CODE)"
else
  fail "Terminal create should return non-empty cashRegisterCode when isCashRegister=true"
fi

request "GET" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals"
expect_status "200" "List terminals"
assert_jq "any(.[]; .terminalId == $TERMINAL_ID and .posCode == \"$TERMINAL_CODE\")" "Created terminal appears in list"

request "GET" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals/$TERMINAL_ID/config-file"
expect_status "200" "Get terminal config file"
assert_jq ".terminalId == $TERMINAL_ID" "Terminal config response references created terminal"
assert_jq '.isConfigFileUploaded == false' "Terminal config file initially empty"

TERMINAL_UPDATE_PAYLOAD=$(cat <<JSON
{
  "posCode": "${TERMINAL_CODE}-UPD",
  "posIpAddress": "10.0.0.11",
  "isServer": false,
  "isCashRegister": true,
  "cashRegisterCode": "$TERMINAL_CASH_DRAWER_CODE",
  "deviceTerminalModelId": $TERMINAL_MODEL_ID,
  "resolutionWidth": 1366,
  "resolutionHeight": 768
}
JSON
)

request "PUT" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals/$TERMINAL_ID" "$TERMINAL_UPDATE_PAYLOAD"
expect_status "200" "Update terminal"
assert_jq '.posCode == "'"${TERMINAL_CODE}"'-UPD"' "Updated terminal posCode persisted"
assert_jq '.resolutionForDisplay == "1366x768"' "Updated terminal resolution persisted"

# Printer create / redirect / update
PRINTER1_PAYLOAD=$(cat <<JSON
{
  "printerName": "$PRINTER1_NAME",
  "isKds": false,
  "isLabelPrinter": false,
  "isDinein": true,
  "isTakeaway": true,
  "autoRedirectPrinterIdList": []
}
JSON
)

request "POST" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers" "$PRINTER1_PAYLOAD"
expect_status "200" "Create base printer"
PRINTER1_ID=$(extract_value '.shopPrinterMasterId')

if [ -z "$PRINTER1_ID" ]; then
  fail "Create base printer - missing shopPrinterMasterId"
  echo "==============================================================="
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi

PRINTER2_PAYLOAD=$(cat <<JSON
{
  "printerName": "$PRINTER2_NAME",
  "isKds": true,
  "isLabelPrinter": false,
  "isDinein": true,
  "isTakeaway": false,
  "autoRedirectPrinterIdList": [$PRINTER1_ID]
}
JSON
)

request "POST" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers" "$PRINTER2_PAYLOAD"
expect_status "200" "Create redirect printer"
PRINTER2_ID=$(extract_value '.shopPrinterMasterId')
assert_jq ".autoRedirectPrinterIdList | index($PRINTER1_ID) != null" "Redirect printer stores redirect target"

request "GET" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers"
expect_status "200" "List printers"
assert_jq "any(.[]; .shopPrinterMasterId == $PRINTER2_ID and (.autoRedirectPrinterIdList | index($PRINTER1_ID) != null))" "Printer redirect mapping persisted"

PRINTER2_UPDATE_PAYLOAD=$(cat <<JSON
{
  "printerName": "${PRINTER2_NAME} Updated",
  "isKds": true,
  "isLabelPrinter": false,
  "isDinein": false,
  "isTakeaway": true,
  "autoRedirectPrinterIdList": [$PRINTER1_ID]
}
JSON
)

request "PUT" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers/$PRINTER2_ID" "$PRINTER2_UPDATE_PAYLOAD"
expect_status "200" "Update redirect printer"
assert_jq '.isDinein == false and .isTakeaway == true' "Updated printer service flags persisted"

# Cash drawer create / update / list
CASH_DRAWER_PAYLOAD=$(cat <<JSON
{
  "cashDrawerName": "$DRAWER_NAME"
}
JSON
)

request "POST" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/cash-drawers" "$CASH_DRAWER_PAYLOAD"
expect_status "200" "Create cash drawer"
CASH_DRAWER_CODE=$(extract_value '.cashDrawerCode')
assert_jq '.cashDrawerName == "'"$DRAWER_NAME"'"' "Created cash drawer name persisted"

if [ -z "$CASH_DRAWER_CODE" ]; then
  fail "Create cash drawer - missing cashDrawerCode"
  echo "==============================================================="
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi

CASH_DRAWER_UPDATE_PAYLOAD=$(cat <<JSON
{
  "cashDrawerName": "${DRAWER_NAME} Updated"
}
JSON
)

ENCODED_DRAWER_CODE=$(urlencode "$CASH_DRAWER_CODE")
request "PUT" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/cash-drawers/$ENCODED_DRAWER_CODE" "$CASH_DRAWER_UPDATE_PAYLOAD"
expect_status "200" "Update cash drawer"
assert_jq '.cashDrawerName == "'"${DRAWER_NAME}"' Updated"' "Updated cash drawer name persisted"

request "GET" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/cash-drawers"
expect_status "200" "List cash drawers"
assert_jq "any(.[]; .cashDrawerCode == \"$CASH_DRAWER_CODE\")" "Created cash drawer appears in list"

# Delete fixtures explicitly (cleanup trap handles retries)
request "DELETE" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers/$PRINTER2_ID"
expect_status "204" "Delete redirect printer"
PRINTER2_ID=""

request "DELETE" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/printers/$PRINTER1_ID"
expect_status "204" "Delete base printer"
PRINTER1_ID=""

request "DELETE" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/terminals/$TERMINAL_ID"
expect_status "204" "Delete terminal"
TERMINAL_ID=""

request "DELETE" "/device-settings/brand/$BRAND_ID/shops/$SHOP_ID/cash-drawers/$ENCODED_DRAWER_CODE"
expect_status "204" "Delete cash drawer"
CASH_DRAWER_CODE=""

echo "==============================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Device settings regression checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
exit 1
