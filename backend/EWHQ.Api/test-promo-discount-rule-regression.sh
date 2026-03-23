#!/bin/bash

# Sprint 4 advanced promotion/discount rule regression checks (WP-052)
# Usage:
#   API_TOKEN=<bearer-token> BRAND_ID=<brand-id> ./test-promo-discount-rule-regression.sh
# Optional:
#   API_URL=http://localhost:5125/api API_TOKEN=<token> BRAND_ID=<id> ./test-promo-discount-rule-regression.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${API_TOKEN:-}"
BRAND_ID="${BRAND_ID:-}"
TMP_BODY="/tmp/ewhq-rule-regression-response-$$.json"

FAILURES=0
HTTP_CODE=""
PROMO_ID=""
DISCOUNT_ID=""

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
  if [ -n "$DISCOUNT_ID" ]; then
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/discounts/brand/$BRAND_ID/$DISCOUNT_ID" >/dev/null 2>&1 || true
  fi

  if [ -n "$PROMO_ID" ]; then
    curl -s -o /dev/null \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/promotions/brand/$BRAND_ID/$PROMO_ID" >/dev/null 2>&1 || true
  fi

  rm -f "$TMP_BODY"
}
trap cleanup_on_exit EXIT

SUFFIX=$(date +%s)
PROMO_CODE="E2ERP${SUFFIX}"
PROMO_NAME="E2E Rule Promo ${SUFFIX}"
DISCOUNT_CODE="E2ERD${SUFFIX}"
DISCOUNT_NAME="E2E Rule Discount ${SUFFIX}"

echo "Rule regression checks against $API_URL (brand $BRAND_ID)"
echo "======================================================"

# Discover category fixture IDs (required for detail-type and include/exclude validations)
request "GET" "/item-categories/brand/$BRAND_ID"
expect_status "200" "List item categories"

PRIMARY_CATEGORY_ID=$(extract_value '[.[] | select((.enabled // true) == true) | .categoryId] | .[0]')
SECONDARY_CATEGORY_ID=$(extract_value '[.[] | select((.enabled // true) == true) | .categoryId] | if length > 1 then .[1] else .[0] end')

if [ -z "$PRIMARY_CATEGORY_ID" ]; then
  fail "Cannot run WP-052 regression without at least one enabled item category"
  echo "======================================================"
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi

if [ -z "$SECONDARY_CATEGORY_ID" ]; then
  SECONDARY_CATEGORY_ID="$PRIMARY_CATEGORY_ID"
fi

pass "Resolved category fixtures (primary=$PRIMARY_CATEGORY_ID secondary=$SECONDARY_CATEGORY_ID)"

# Optional item fixture for item-level arrays
request "GET" "/menu-items/brand/$BRAND_ID?categoryId=$PRIMARY_CATEGORY_ID&page=1&pageSize=10"
expect_status "200" "List menu items for primary category"
ITEM_ID=$(extract_value '.items[0].itemId')
ITEM_IDS_JSON="[]"
if [ -n "$ITEM_ID" ]; then
  ITEM_IDS_JSON="[$ITEM_ID]"
  pass "Resolved optional item fixture (itemId=$ITEM_ID)"
else
  echo -e "${YELLOW}WARN${NC} No enabled items found in primary category. Item-level assertions will be skipped."
fi

# Create promotion fixture
request "POST" "/promotions/brand/$BRAND_ID" "{\"promoCode\":\"$PROMO_CODE\",\"promoName\":\"$PROMO_NAME\",\"promoSaveAmount\":8.5,\"priority\":1,\"enabled\":true,\"isAvailable\":true}"
expect_status "200" "Create promotion fixture"
PROMO_ID=$(extract_value '.promoHeaderId')
if [ -z "$PROMO_ID" ]; then
  fail "Create promotion fixture - missing promoHeaderId"
  echo "======================================================"
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi

# Create discount fixture
request "POST" "/discounts/brand/$BRAND_ID" "{\"discountCode\":\"$DISCOUNT_CODE\",\"discountName\":\"$DISCOUNT_NAME\",\"isFixedAmount\":false,\"discountPercent\":10,\"priority\":1,\"enabled\":true,\"isAvailable\":true}"
expect_status "200" "Create discount fixture"
DISCOUNT_ID=$(extract_value '.discountId')
if [ -z "$DISCOUNT_ID" ]; then
  fail "Create discount fixture - missing discountId"
  echo "======================================================"
  echo -e "${RED}$FAILURES check(s) failed.${NC}"
  exit 1
fi

# Promotion rule editor: load + advanced update + verify + negative case
request "GET" "/promotions/brand/$BRAND_ID/$PROMO_ID/rule-editor"
expect_status "200" "Load promotion rule editor"

PROMO_SHOP_RULES_JSON=$(jq -c '
  if (.shopRules | length) == 0 then
    []
  elif (.shopRules | length) == 1 then
    [
      { shopId: .shopRules[0].shopId, shopName: (.shopRules[0].shopName // ""), enabled: false }
    ]
  else
    [
      { shopId: .shopRules[0].shopId, shopName: (.shopRules[0].shopName // ""), enabled: false },
      { shopId: .shopRules[1].shopId, shopName: (.shopRules[1].shopName // ""), enabled: true }
    ]
  end
' "$TMP_BODY")
PROMO_SHOP1_ID=$(extract_value '.shopRules[0].shopId')
PROMO_SHOP2_ID=$(extract_value '.shopRules[1].shopId')

PROMO_RULE_PAYLOAD=$(cat <<JSON
{
  "bundlePromoHeaderTypeId": 5,
  "promoCode": "$PROMO_CODE",
  "promoName": "${PROMO_NAME} Advanced",
  "bundlePromoDesc": "WP-052 promotion rule regression",
  "promoSaveAmount": 9.25,
  "priority": 3,
  "enabled": true,
  "isAvailable": true,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T00:00:00Z",
  "startTime": "09:00:00",
  "endTime": "22:00:00",
  "isCoexistPromo": true,
  "isAmountDeductEvenly": true,
  "isPromoDetailMatchMustExist": true,
  "flatPrice": 42.5,
  "dayOfWeeks": "1,2,5",
  "months": "1,6,12",
  "dates": "1,15,28",
  "mandatoryDetails": [
    {
      "bundlePromoDetailTypeId": 1,
      "selectedCategoryId": $PRIMARY_CATEGORY_ID,
      "bundleDeductRuleTypeId": 0,
      "enabled": true,
      "isOptionalItem": false,
      "isReplaceItem": false,
      "isItemCanReplace": false,
      "priceReplace": null,
      "groupIndex": null,
      "isDepartmentRevenue": false,
      "departmentRevenue": null
    }
  ],
  "optionalDetailGroups": [
    {
      "groupIndex": 2,
      "details": [
        {
          "bundlePromoDetailTypeId": 1,
          "selectedCategoryId": $SECONDARY_CATEGORY_ID,
          "bundleDeductRuleTypeId": 0,
          "enabled": true,
          "isOptionalItem": true,
          "isReplaceItem": false,
          "isItemCanReplace": true,
          "priceReplace": 0,
          "groupIndex": 2,
          "isDepartmentRevenue": true,
          "departmentRevenue": 5.5
        }
      ]
    }
  ],
  "shopRules": $PROMO_SHOP_RULES_JSON
}
JSON
)

request "PUT" "/promotions/brand/$BRAND_ID/$PROMO_ID/rule-editor" "$PROMO_RULE_PAYLOAD"
expect_status "200" "Update promotion rule editor with advanced payload"
assert_jq '.bundlePromoHeaderTypeId == 5' "Promotion type persisted"
assert_jq '.dayOfWeeks == "1,2,5"' "Promotion day-of-week rule persisted"
assert_jq '.months == "1,6,12"' "Promotion month rule persisted"
assert_jq '.dates == "1,15,28"' "Promotion date rule persisted"
assert_jq '.mandatoryDetails | length == 1' "Promotion mandatory detail count persisted"
assert_jq '.optionalDetailGroups | length == 1' "Promotion optional group count persisted"
assert_jq '.optionalDetailGroups[0].details | length == 1' "Promotion optional detail count persisted"

if [ -n "$PROMO_SHOP1_ID" ]; then
  assert_jq ".shopRules[] | select(.shopId == $PROMO_SHOP1_ID) | .enabled == false" "Promotion shop override persisted for first shop"
fi

if [ -n "$PROMO_SHOP2_ID" ]; then
  assert_jq ".shopRules[] | select(.shopId == $PROMO_SHOP2_ID) | .enabled == true" "Promotion shop override persisted for second shop"
fi

request "GET" "/promotions/brand/$BRAND_ID/$PROMO_ID/rule-editor"
expect_status "200" "Reload promotion rule editor after update"
assert_jq '.isPromoDetailMatchMustExist == true' "Promotion boolean flags persisted on reload"

PROMO_INVALID_PAYLOAD=$(cat <<JSON
{
  "bundlePromoHeaderTypeId": 5,
  "promoCode": "$PROMO_CODE",
  "promoName": "${PROMO_NAME} Invalid",
  "bundlePromoDesc": "Invalid optional group case",
  "promoSaveAmount": 8,
  "priority": 1,
  "enabled": true,
  "isAvailable": true,
  "mandatoryDetails": [],
  "optionalDetailGroups": [
    {
      "groupIndex": 1,
      "details": []
    }
  ],
  "shopRules": []
}
JSON
)

request "PUT" "/promotions/brand/$BRAND_ID/$PROMO_ID/rule-editor" "$PROMO_INVALID_PAYLOAD"
expect_status "400" "Promotion validation rejects empty optional group"

# Discount rule editor: load + advanced update + verify + negative case
request "GET" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID/rule-editor"
expect_status "200" "Load discount rule editor"

DISCOUNT_SHOP_RULES_JSON=$(jq -c '
  if (.shopRules | length) == 0 then
    []
  elif (.shopRules | length) == 1 then
    [
      { shopId: .shopRules[0].shopId, shopName: (.shopRules[0].shopName // ""), enabled: false }
    ]
  else
    [
      { shopId: .shopRules[0].shopId, shopName: (.shopRules[0].shopName // ""), enabled: false },
      { shopId: .shopRules[1].shopId, shopName: (.shopRules[1].shopName // ""), enabled: true }
    ]
  end
' "$TMP_BODY")
DISCOUNT_SHOP1_ID=$(extract_value '.shopRules[0].shopId')
DISCOUNT_SHOP2_ID=$(extract_value '.shopRules[1].shopId')

DISCOUNT_RULE_PAYLOAD=$(cat <<JSON
{
  "bundlePromoHeaderTypeId": 7,
  "discountCode": "$DISCOUNT_CODE",
  "discountName": "${DISCOUNT_NAME} Advanced",
  "bundlePromoDesc": "WP-052 discount rule regression",
  "priority": 4,
  "enabled": true,
  "isAvailable": true,
  "isAutoCalculate": true,
  "isFixedAmount": false,
  "isOpenAmount": false,
  "discountPercent": 12.5,
  "discountAmount": null,
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-12-31T00:00:00Z",
  "startTime": "08:00:00",
  "endTime": "21:00:00",
  "isNoOtherLoyalty": true,
  "mandatoryIncludedCategoryIds": [$PRIMARY_CATEGORY_ID],
  "mandatoryIncludedItemIds": $ITEM_IDS_JSON,
  "mandatoryIncludedModifierItemIds": [],
  "mandatoryExcludedCategoryIds": [$SECONDARY_CATEGORY_ID],
  "mandatoryExcludedItemIds": [],
  "mandatoryExcludedModifierItemIds": [],
  "priceSpecific": 10,
  "priceHigherThanEqualToSpecific": 8,
  "priceLowerThanEqualToSpecific": 100,
  "isLinkedWithThirdPartyLoyalty": true,
  "linkedThirdPartyLoyaltyCode": "LOY-$SUFFIX",
  "isAppliedOnItemLevel": false,
  "upgradeModifierItemId": null,
  "discountTag": "TAG-$SUFFIX",
  "discountBenefitModifierAmountAdjustment": "+1.25",
  "minOrderAmount": 30,
  "maxOrderAmount": 500,
  "minMatchedItemAmount": 10,
  "maxMatchedItemAmount": 200,
  "minMatchedItemQty": 1,
  "maxDiscountAmount": 100,
  "maxDiscountQty": 20,
  "discountFirstQty": 1,
  "conditionalDayOfWeeks": "1,3,5",
  "conditionalMonths": "2,4,6",
  "conditionalDates": "5,15,25",
  "conditionalStartDate": "2026-02-01T00:00:00Z",
  "conditionalEndDate": "2026-11-30T00:00:00Z",
  "conditionalStartTime": "10:00:00",
  "conditionalEndTime": "20:00:00",
  "calculateIncludedSubItems": true,
  "matchMultiple": true,
  "discountedCategoryIds": [$PRIMARY_CATEGORY_ID],
  "discountedItemIds": $ITEM_IDS_JSON,
  "discountedModifierItemIds": [],
  "discountedItemPriceOrderDescending": true,
  "promoHeaderIds": [$PROMO_ID],
  "shopRules": $DISCOUNT_SHOP_RULES_JSON
}
JSON
)

request "PUT" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID/rule-editor" "$DISCOUNT_RULE_PAYLOAD"
expect_status "200" "Update discount rule editor with advanced payload"
assert_jq '.bundlePromoHeaderTypeId == 7' "Discount type persisted"
assert_jq '.discountPercent == 12.5' "Discount percent persisted"
assert_jq '.conditionalDayOfWeeks == "1,3,5"' "Discount conditional weekday persisted"
assert_jq ".promoHeaderIds | index($PROMO_ID) != null" "Discount promo linkage persisted"
assert_jq ".mandatoryIncludedCategoryIds | index($PRIMARY_CATEGORY_ID) != null" "Discount include-category rule persisted"
assert_jq '.isLinkedWithThirdPartyLoyalty == true' "Discount loyalty linkage flag persisted"

if [ -n "$ITEM_ID" ]; then
  assert_jq ".mandatoryIncludedItemIds | index($ITEM_ID) != null" "Discount include-item rule persisted"
fi

if [ -n "$DISCOUNT_SHOP1_ID" ]; then
  assert_jq ".shopRules[] | select(.shopId == $DISCOUNT_SHOP1_ID) | .enabled == false" "Discount shop override persisted for first shop"
fi

if [ -n "$DISCOUNT_SHOP2_ID" ]; then
  assert_jq ".shopRules[] | select(.shopId == $DISCOUNT_SHOP2_ID) | .enabled == true" "Discount shop override persisted for second shop"
fi

request "GET" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID/rule-editor"
expect_status "200" "Reload discount rule editor after update"
assert_jq '.matchMultiple == true' "Discount matchMultiple persisted on reload"

DISCOUNT_INVALID_PAYLOAD=$(cat <<JSON
{
  "bundlePromoHeaderTypeId": 7,
  "discountCode": "$DISCOUNT_CODE",
  "discountName": "${DISCOUNT_NAME} Invalid",
  "priority": 1,
  "enabled": true,
  "isAvailable": true,
  "isAutoCalculate": false,
  "isFixedAmount": false,
  "isOpenAmount": false,
  "discountPercent": 10,
  "discountAmount": null,
  "isNoOtherLoyalty": false,
  "mandatoryIncludedCategoryIds": [],
  "mandatoryIncludedItemIds": [],
  "mandatoryIncludedModifierItemIds": [],
  "mandatoryExcludedCategoryIds": [],
  "mandatoryExcludedItemIds": [],
  "mandatoryExcludedModifierItemIds": [],
  "isLinkedWithThirdPartyLoyalty": false,
  "isAppliedOnItemLevel": false,
  "calculateIncludedSubItems": false,
  "matchMultiple": false,
  "discountedCategoryIds": [],
  "discountedItemIds": [],
  "discountedModifierItemIds": [],
  "discountedItemPriceOrderDescending": false,
  "promoHeaderIds": [],
  "conditionalStartDate": "2026-12-31T00:00:00Z",
  "conditionalEndDate": "2026-01-01T00:00:00Z",
  "shopRules": []
}
JSON
)

request "PUT" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID/rule-editor" "$DISCOUNT_INVALID_PAYLOAD"
expect_status "400" "Discount validation rejects invalid conditional date range"

# Lifecycle transitions: deactivate and confirm disabled state remains queryable
request "DELETE" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID"
expect_status "204" "Deactivate discount lifecycle transition"

request "GET" "/discounts/brand/$BRAND_ID/$DISCOUNT_ID/rule-editor"
expect_status "200" "Load discount rule editor after deactivation"
assert_jq '.enabled == false' "Discount disabled state persisted after deactivation"
DISCOUNT_ID=""

request "DELETE" "/promotions/brand/$BRAND_ID/$PROMO_ID"
expect_status "204" "Deactivate promotion lifecycle transition"

request "GET" "/promotions/brand/$BRAND_ID/$PROMO_ID/rule-editor"
expect_status "200" "Load promotion rule editor after deactivation"
assert_jq '.enabled == false' "Promotion disabled state persisted after deactivation"
PROMO_ID=""

echo "======================================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Promotion/discount rule regression checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
exit 1
