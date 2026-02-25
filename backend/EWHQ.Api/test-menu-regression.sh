#!/bin/bash

# Sprint 4 menu regression baseline checks (WP-022 baseline)
# Usage:
#   AUTH0_TOKEN=<bearer-token> BRAND_ID=<brand-id> ./test-menu-regression.sh
# Optional:
#   API_URL=http://localhost:5125/api AUTH0_TOKEN=<token> BRAND_ID=<id> ./test-menu-regression.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${AUTH0_TOKEN:-}"
BRAND_ID="${BRAND_ID:-}"
TMP_BODY="/tmp/ewhq-menu-regression-response.json"

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

FAILURES=0
HTTP_CODE=""

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

extract_id() {
  local expr="$1"
  jq -r "$expr // empty" "$TMP_BODY" 2>/dev/null
}

SUFFIX=$(date +%s)
MOD_NAME="E2E Modifier ${SUFFIX}"
SET_NAME="E2E MealSet ${SUFFIX}"
PROMO_CODE="E2EP${SUFFIX}"
PROMO_NAME="E2E Promo ${SUFFIX}"
DISCOUNT_CODE="E2ED${SUFFIX}"
DISCOUNT_NAME="E2E Discount ${SUFFIX}"

MOD_GROUP_ID=""
SET_GROUP_ID=""
PROMO_ID=""
DISCOUNT_ID=""

echo "Menu regression baseline against $API_URL (brand $BRAND_ID)"
echo "========================================================="

# Modifier groups list (modifier mode)
request "GET" "/modifier-groups/brand/$BRAND_ID?isFollowSet=false"
expect_status "200" "List modifier groups"

# Modifier groups list (meal-set mode)
request "GET" "/modifier-groups/brand/$BRAND_ID?isFollowSet=true"
expect_status "200" "List meal-set groups"

# Create modifier group
request "POST" "/modifier-groups/brand/$BRAND_ID" "{\"groupBatchName\":\"$MOD_NAME\",\"enabled\":true,\"isFollowSet\":false,\"items\":[]}"
expect_status "201" "Create modifier group"
MOD_GROUP_ID=$(extract_id '.groupHeaderId')

if [ -n "$MOD_GROUP_ID" ]; then
  request "PUT" "/modifier-groups/brand/$BRAND_ID/$MOD_GROUP_ID" "{\"groupBatchName\":\"${MOD_NAME} Updated\",\"enabled\":true,\"items\":[]}"
  expect_status "200" "Update modifier group"

  request "DELETE" "/modifier-groups/brand/$BRAND_ID/$MOD_GROUP_ID"
  expect_status "204" "Deactivate modifier group"
else
  fail "Create modifier group - missing groupHeaderId"
fi

# Create meal-set group
request "POST" "/modifier-groups/brand/$BRAND_ID" "{\"groupBatchName\":\"$SET_NAME\",\"enabled\":true,\"isFollowSet\":true,\"items\":[]}"
expect_status "201" "Create meal-set group"
SET_GROUP_ID=$(extract_id '.groupHeaderId')

if [ -n "$SET_GROUP_ID" ]; then
  request "PUT" "/modifier-groups/brand/$BRAND_ID/$SET_GROUP_ID" "{\"groupBatchName\":\"${SET_NAME} Updated\",\"enabled\":true,\"items\":[]}"
  expect_status "200" "Update meal-set group"

  request "DELETE" "/modifier-groups/brand/$BRAND_ID/$SET_GROUP_ID"
  expect_status "204" "Deactivate meal-set group"
else
  fail "Create meal-set group - missing groupHeaderId"
fi

# Create promotion
request "POST" "/promotions/brand/$BRAND_ID" "{\"promoCode\":\"$PROMO_CODE\",\"promoName\":\"$PROMO_NAME\",\"promoSaveAmount\":10,\"priority\":1,\"enabled\":true}"
expect_status "200" "Create promotion"
PROMO_ID=$(extract_id '.promoHeaderId')

if [ -n "$PROMO_ID" ]; then
  request "PUT" "/promotions/brand/$BRAND_ID/$PROMO_ID" "{\"promoCode\":\"$PROMO_CODE\",\"promoName\":\"${PROMO_NAME} Updated\",\"promoSaveAmount\":12,\"priority\":2,\"enabled\":true}"
  expect_status "200" "Update promotion"

  request "DELETE" "/promotions/brand/$BRAND_ID/$PROMO_ID"
  expect_status "204" "Deactivate promotion"
else
  fail "Create promotion - missing promoHeaderId"
fi

# Create discount
request "POST" "/discounts/brand/$BRAND_ID" "{\"discountCode\":\"$DISCOUNT_CODE\",\"discountName\":\"$DISCOUNT_NAME\",\"isFixedAmount\":false,\"discountPercent\":10,\"priority\":1,\"enabled\":true}"
expect_status "200" "Create discount"
DISCOUNT_ID=$(extract_id '.discountId')

if [ -n "$DISCOUNT_ID" ]; then
  request "PUT" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID" "{\"discountCode\":\"$DISCOUNT_CODE\",\"discountName\":\"${DISCOUNT_NAME} Updated\",\"isFixedAmount\":true,\"discountAmount\":5,\"priority\":2,\"enabled\":true}"
  expect_status "200" "Update discount"

  request "DELETE" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID"
  expect_status "204" "Deactivate discount"
else
  fail "Create discount - missing discountId"
fi

echo "========================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Menu regression baseline checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
exit 1
