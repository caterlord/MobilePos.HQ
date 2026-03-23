#!/bin/bash

# Auth-protected API smoke checks
# Usage:
#   API_TOKEN=<bearer-token> ./test-auth.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:5125/api"
TOKEN="${API_TOKEN:-}"

echo "Testing EWHQ API Authentication"
echo "========================================"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}API_TOKEN is not set.${NC}"
  echo "Get a valid bearer token and export it first:"
  echo "  export API_TOKEN='<your-bearer-token>'"
  exit 1
fi

auth_get() {
  local path="$1"
  local label="$2"

  echo -e "\n${GREEN}${label}${NC}"
  local code
  code=$(curl -s -o /tmp/ewhq-auth-response.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL$path")

  echo "GET $API_URL$path"
  echo "Status: $code"

  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
  fi

  if command -v jq >/dev/null 2>&1; then
    jq '.' /tmp/ewhq-auth-response.json 2>/dev/null || cat /tmp/ewhq-auth-response.json
  else
    cat /tmp/ewhq-auth-response.json
  fi
}

auth_get "/auth/profile" "Test 1: Fetch current Clerk-synced profile"
auth_get "/tenants/check-setup" "Test 2: Check tenant setup status"
auth_get "/user-access/companies-brands" "Test 3: Fetch companies/brands access"

echo -e "\n========================================"
echo "Done."
