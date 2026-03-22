#!/bin/bash

# Sprint 1 smoke: token -> onboarding invite flow -> brand load/select (WP-007)
# Usage:
#   AUTH0_TOKEN=<bearer-token> INVITATION_TOKEN=<invite-token> ./test-smoke-onboarding-brand.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${AUTH0_TOKEN:-}"
INVITATION_TOKEN="${INVITATION_TOKEN:-}"
TMP_BODY="/tmp/ewhq-smoke-body.json"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}AUTH0_TOKEN is not set.${NC}"
  echo "  export AUTH0_TOKEN='<access-token>'"
  exit 1
fi

if [ -z "$INVITATION_TOKEN" ]; then
  echo -e "${YELLOW}INVITATION_TOKEN is not set.${NC}"
  echo "  export INVITATION_TOKEN='<invitation-token-from-link>'"
  exit 1
fi

has_jq=false
if command -v jq >/dev/null 2>&1; then
  has_jq=true
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

body_text() {
  cat "$TMP_BODY"
}

json_value() {
  local expr="$1"
  if [ "$has_jq" = true ]; then
    jq -r "$expr" "$TMP_BODY" 2>/dev/null
  else
    echo ""
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

echo "Sprint 1 smoke checks against $API_URL"
echo "========================================"

# 1) Invitation validation
request "GET" "/invitations/validate/$INVITATION_TOKEN"
if [ "$HTTP_CODE" = "200" ]; then
  pass "Invitation validate returned 200"
elif [ "$HTTP_CODE" = "400" ]; then
  msg=$(json_value '.message // empty')
  if [ "$msg" = "Invitation has already been accepted" ]; then
    warn "Invitation already accepted (continuing smoke run)"
  else
    fail "Invitation validate returned 400: ${msg:-$(body_text)}"
  fi
else
  fail "Invitation validate returned unexpected status $HTTP_CODE"
fi

# 2) Invitation acceptance with dual payload keys
request "POST" "/invitations/accept" "{\"token\":\"$INVITATION_TOKEN\",\"inviteCode\":\"$INVITATION_TOKEN\"}"
if [ "$HTTP_CODE" = "200" ]; then
  requires_verification=$(json_value '.requiresEmailVerification // empty')
  if [ "$requires_verification" = "true" ]; then
    fail "Invitation acceptance entered email-verification branch; smoke expects direct accept path"
  else
    pass "Invitation accepted"
  fi
elif [ "$HTTP_CODE" = "400" ]; then
  msg=$(json_value '.message // empty')
  if [ "$msg" = "Invitation has already been accepted" ]; then
    warn "Invitation already accepted from earlier run (continuing)"
  else
    fail "Invitation accept returned 400: ${msg:-$(body_text)}"
  fi
else
  fail "Invitation accept returned unexpected status $HTTP_CODE"
fi

# 3) Brand load
request "GET" "/user-access/companies-brands"
if [ "$HTTP_CODE" = "200" ]; then
  pass "Brand load endpoint reachable"
else
  fail "Brand load failed with status $HTTP_CODE"
fi

BRAND_ID=""
if [ "$has_jq" = true ]; then
  BRAND_ID=$(jq -r '.data[0].brands[0].id // empty' "$TMP_BODY" 2>/dev/null)
else
  BRAND_ID=$(grep -oE '"id"[[:space:]]*:[[:space:]]*[0-9]+' "$TMP_BODY" | head -n1 | grep -oE '[0-9]+' || true)
fi

if [ -z "$BRAND_ID" ]; then
  fail "No brand available after onboarding; expected at least one brand"
else
  pass "Found brand ID $BRAND_ID"

  # 4) Brand selection
  request "POST" "/user-access/select-brand" "{\"brandId\":$BRAND_ID}"
  if [ "$HTTP_CODE" = "200" ]; then
    pass "Brand selection succeeded"
  else
    fail "Brand selection failed with status $HTTP_CODE"
  fi
fi

echo "========================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}Smoke suite passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES smoke check(s) failed.${NC}"
echo "Last response body:"
cat "$TMP_BODY"
exit 1
