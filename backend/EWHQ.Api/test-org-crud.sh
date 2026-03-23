#!/bin/bash

# Sprint 2 organization CRUD regression checks (WP-012 baseline)
# Usage:
#   API_TOKEN=<bearer-token> ./test-org-crud.sh
# Optional:
#   API_URL=http://localhost:5125/api API_TOKEN=<token> ./test-org-crud.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${API_TOKEN:-}"
TMP_BODY="/tmp/ewhq-org-crud-response.json"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}API_TOKEN is not set.${NC}"
  echo "  export API_TOKEN='<access-token>'"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}curl is required${NC}"
  exit 1
fi

HAS_JQ=false
if command -v jq >/dev/null 2>&1; then
  HAS_JQ=true
fi

FAILURES=0

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

json_value() {
  local expr="$1"
  if [ "$HAS_JQ" = true ]; then
    jq -r "$expr" "$TMP_BODY" 2>/dev/null
  else
    echo ""
  fi
}

pass() {
  echo -e "${GREEN}PASS${NC} $1"
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
  fi
}

assert_hierarchy_contains() {
  local label="$1"
  local company_name="$2"
  local brand_name="$3"
  local shop_name="$4"

  request "GET" "/user-access/hierarchical-data"
  expect_status "200" "$label - hierarchical data loaded"

  if [ "$HAS_JQ" = true ]; then
    local found
    found=$(jq -r --arg c "$company_name" --arg b "$brand_name" --arg s "$shop_name" '
      .data[] | select(.name == $c) | .brands[] | select(.name == $b) | .shops[] | select(.name == $s) | .name
    ' "$TMP_BODY" 2>/dev/null | head -n 1)

    if [ "$found" = "$shop_name" ]; then
      pass "$label - hierarchy contains company/brand/shop"
    else
      fail "$label - hierarchy missing expected records"
    fi
  else
    if grep -q "$company_name" "$TMP_BODY" && grep -q "$brand_name" "$TMP_BODY" && grep -q "$shop_name" "$TMP_BODY"; then
      pass "$label - hierarchy contains company/brand/shop"
    else
      fail "$label - hierarchy missing expected records"
    fi
  fi
}

SUFFIX=$(date +%s)
COMPANY_NAME="E2E Co ${SUFFIX}"
BRAND_NAME="E2E Brand ${SUFFIX}"
SHOP_NAME="E2E Shop ${SUFFIX}"
UPDATED_COMPANY_NAME="E2E Co ${SUFFIX} Updated"
UPDATED_BRAND_NAME="E2E Brand ${SUFFIX} Updated"
UPDATED_SHOP_NAME="E2E Shop ${SUFFIX} Updated"

COMPANY_ID=""
BRAND_ID=""
SHOP_ID=""

echo "Organization CRUD regression against $API_URL"
echo "========================================"

# Create company
request "POST" "/user-access/create-company" "{\"name\":\"$COMPANY_NAME\",\"description\":\"org crud test\"}"
expect_status "200" "Create company"
COMPANY_ID=$(json_value '.data.id // empty')
if [ -z "$COMPANY_ID" ]; then
  fail "Create company - missing company id"
fi

# Create brand
if [ -n "$COMPANY_ID" ]; then
  request "POST" "/user-access/create-brand" "{\"parentId\":$COMPANY_ID,\"name\":\"$BRAND_NAME\",\"description\":\"org crud test\"}"
  expect_status "200" "Create brand"
  BRAND_ID=$(json_value '.data.id // empty')
  if [ -z "$BRAND_ID" ]; then
    fail "Create brand - missing brand id"
  fi
fi

# Create shop
if [ -n "$BRAND_ID" ]; then
  request "POST" "/user-access/create-shop" "{\"parentId\":$BRAND_ID,\"name\":\"$SHOP_NAME\",\"address\":\"E2E Address\"}"
  expect_status "200" "Create shop"
  SHOP_ID=$(json_value '.data.id // empty')
  if [ -z "$SHOP_ID" ]; then
    fail "Create shop - missing shop id"
  fi
fi

# Update company
if [ -n "$COMPANY_ID" ]; then
  request "POST" "/user-access/update-company" "{\"id\":$COMPANY_ID,\"name\":\"$UPDATED_COMPANY_NAME\",\"description\":\"updated\"}"
  expect_status "200" "Update company"
fi

# Update brand
if [ -n "$BRAND_ID" ]; then
  request "POST" "/user-access/update-brand" "{\"id\":$BRAND_ID,\"name\":\"$UPDATED_BRAND_NAME\",\"description\":\"updated\"}"
  expect_status "200" "Update brand"
fi

# Update shop
if [ -n "$SHOP_ID" ]; then
  request "POST" "/user-access/update-shop" "{\"id\":$SHOP_ID,\"name\":\"$UPDATED_SHOP_NAME\",\"address\":\"Updated Address\"}"
  expect_status "200" "Update shop"
fi

if [ -n "$COMPANY_ID" ] && [ -n "$BRAND_ID" ] && [ -n "$SHOP_ID" ]; then
  assert_hierarchy_contains "Post-update hierarchy check" "$UPDATED_COMPANY_NAME" "$UPDATED_BRAND_NAME" "$UPDATED_SHOP_NAME"
fi

# Negative validation checks (duplicate names)
if [ -n "$COMPANY_ID" ]; then
  request "POST" "/user-access/create-company" "{\"name\":\"$UPDATED_COMPANY_NAME\"}"
  if [ "$HTTP_CODE" = "409" ]; then
    pass "Duplicate company name rejected"
  else
    fail "Duplicate company name expected 409, got $HTTP_CODE"
  fi
fi

if [ -n "$BRAND_ID" ]; then
  request "POST" "/user-access/create-brand" "{\"parentId\":$COMPANY_ID,\"name\":\"$UPDATED_BRAND_NAME\"}"
  if [ "$HTTP_CODE" = "409" ]; then
    pass "Duplicate brand name rejected"
  else
    fail "Duplicate brand name expected 409, got $HTTP_CODE"
  fi
fi

if [ -n "$SHOP_ID" ]; then
  request "POST" "/user-access/create-shop" "{\"parentId\":$BRAND_ID,\"name\":\"$UPDATED_SHOP_NAME\"}"
  if [ "$HTTP_CODE" = "409" ]; then
    pass "Duplicate shop name rejected"
  else
    fail "Duplicate shop name expected 409, got $HTTP_CODE"
  fi
fi

# Cleanup in leaf-to-root order
if [ -n "$SHOP_ID" ]; then
  request "DELETE" "/user-access/delete-shop/$SHOP_ID"
  expect_status "200" "Delete shop"
fi

if [ -n "$BRAND_ID" ]; then
  request "DELETE" "/user-access/delete-brand/$BRAND_ID"
  expect_status "200" "Delete brand"
fi

if [ -n "$COMPANY_ID" ]; then
  request "DELETE" "/user-access/delete-company/$COMPANY_ID"
  expect_status "200" "Delete company"
fi

echo "========================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Organization CRUD regression checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
exit 1
