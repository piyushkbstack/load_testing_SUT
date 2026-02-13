#!/bin/bash

# Quick Validation Script for RCA Mock Site
# Run this after deployment to verify all endpoints

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get site URL from argument or use default
SITE_URL="${1:-http://localhost:8788}"

echo "================================================"
echo "  RCA Mock Site - Validation Tests"
echo "================================================"
echo ""
echo "Testing site: $SITE_URL"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing: $name ... "
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        FAILED=$((FAILED + 1))
    fi
}

# Test 1: Basic success
test_endpoint "Basic API call" "$SITE_URL/api/test" "200"

# Test 2: 500 error
test_endpoint "500 Error simulation" "$SITE_URL/api/test?status=500" "500"

# Test 3: 404 error
test_endpoint "404 Error simulation" "$SITE_URL/api/test?status=404" "404"

# Test 4: 401 error
test_endpoint "401 Auth error" "$SITE_URL/api/test?status=401&errorType=auth" "401"

# Test 5: DB error with 503
test_endpoint "503 DB error" "$SITE_URL/api/test?status=503&errorType=db" "503"

# Test 6: Delay test (check timing)
echo -n "Testing: Artificial delay (2s) ... "
start_time=$(date +%s)
curl -s "$SITE_URL/api/test?delay=2000" > /dev/null
end_time=$(date +%s)
elapsed=$((end_time - start_time))

if [ $elapsed -ge 2 ] && [ $elapsed -le 3 ]; then
    echo -e "${GREEN}✓ PASS${NC} (Took ${elapsed}s)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Expected ~2s, Got ${elapsed}s)"
    FAILED=$((FAILED + 1))
fi

# Test 7: Large payload
echo -n "Testing: Large payload (100KB) ... "
response=$(curl -s "$SITE_URL/api/test?size=100")
size=${#response}

if [ $size -gt 90000 ]; then
    echo -e "${GREEN}✓ PASS${NC} (Size: $size bytes)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Expected >90KB, Got $size bytes)"
    FAILED=$((FAILED + 1))
fi

# Test 8: Check response headers
echo -n "Testing: Response headers ... "
headers=$(curl -s -I "$SITE_URL/api/test")

if echo "$headers" | grep -q "application/json" && echo "$headers" | grep -q "no-store"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Missing required headers)"
    FAILED=$((FAILED + 1))
fi

# Test 9: Homepage loads
echo -n "Testing: Homepage (/) ... "
status=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/")
if [ "$status" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Test 10: Large page loads
echo -n "Testing: Large page (/large.html) ... "
status=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/large.html")
if [ "$status" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (Status: $status)"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "================================================"
echo "  Test Results"
echo "================================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Site is ready for load testing.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review above.${NC}"
    exit 1
fi
