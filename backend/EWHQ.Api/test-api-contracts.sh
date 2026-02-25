#!/bin/bash

# API contract baseline checks for Sprint 1 (WP-005)
# Usage:
#   AUTH0_TOKEN=<bearer-token> ./test-api-contracts.sh

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:5125/api}"
TOKEN="${AUTH0_TOKEN:-}"
TMP_BODY="/tmp/ewhq-contract-body.json"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}AUTH0_TOKEN is not set.${NC}"
  echo "Set a valid Auth0 bearer token first:"
  echo "  export AUTH0_TOKEN='<access-token>'"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo -e "${RED}curl is required${NC}"
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

assert_status() {
  local label="$1"
  shift
  local expected=("$@")

  for status in "${expected[@]}"; do
    if [ "$HTTP_CODE" = "$status" ]; then
      echo -e "${GREEN}PASS${NC} ${label} (status $HTTP_CODE)"
      return
    fi
  done

  echo -e "${RED}FAIL${NC} ${label} (status $HTTP_CODE, expected: ${expected[*]})"
  FAILURES=$((FAILURES + 1))
}

assert_json_has_key() {
  local label="$1"
  local key="$2"

  if [ "$has_jq" = true ]; then
    if jq -e ". | has(\"$key\")" "$TMP_BODY" >/dev/null 2>&1; then
      echo -e "${GREEN}PASS${NC} ${label} contains key '$key'"
      return
    fi
  else
    if grep -q "\"$key\"" "$TMP_BODY"; then
      echo -e "${GREEN}PASS${NC} ${label} contains key '$key'"
      return
    fi
  fi

  echo -e "${RED}FAIL${NC} ${label} missing key '$key'"
  FAILURES=$((FAILURES + 1))
}

dump_body() {
  if [ "$has_jq" = true ]; then
    jq '.' "$TMP_BODY" 2>/dev/null || cat "$TMP_BODY"
  else
    cat "$TMP_BODY"
  fi
}

echo "API contract checks against $API_URL"
echo "========================================"

# 1) Auth0 profile contract
request "GET" "/auth0/profile"
assert_status "GET /auth0/profile" 200
assert_json_has_key "GET /auth0/profile" "userId"
assert_json_has_key "GET /auth0/profile" "email"
assert_json_has_key "GET /auth0/profile" "roles"

# 2) Tenant setup status contract
request "GET" "/tenants/check-setup"
assert_status "GET /tenants/check-setup" 200
assert_json_has_key "GET /tenants/check-setup" "hasSetup"

# 3) Invitation validate negative contract (plural route)
request "GET" "/invitations/validate/contract-invalid-token"
assert_status "GET /invitations/validate/{token} invalid token" 404
assert_json_has_key "GET /invitations/validate/{token} invalid token" "message"

# 4) Invitation validate negative contract (singular alias)
request "GET" "/invitation/validate/contract-invalid-token"
assert_status "GET /invitation/validate/{token} invalid token" 404
assert_json_has_key "GET /invitation/validate/{token} invalid token" "message"

# 5) Invitation accept payload guard (plural route)
request "POST" "/invitations/accept" '{}'
assert_status "POST /invitations/accept missing token" 400
assert_json_has_key "POST /invitations/accept missing token" "message"

# 6) Invitation accept payload guard (singular alias)
request "POST" "/invitation/accept" '{}'
assert_status "POST /invitation/accept missing token" 400
assert_json_has_key "POST /invitation/accept missing token" "message"

echo "========================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}All contract checks passed.${NC}"
  exit 0
fi

echo -e "${RED}$FAILURES check(s) failed.${NC}"
echo "Last response body:"
dump_body
exit 1
