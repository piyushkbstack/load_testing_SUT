#!/bin/bash

##############################################################################
# K6 Test Suite Runner
# Purpose: Execute all K6 tests sequentially and generate summary report
# Usage: ./run-all-tests.sh [BASE_URL] [VUS] [DURATION]
##############################################################################

set -e

BASE_URL="${1:-https://load-testing-sut.pages.dev}"
VUS="${2:-30}"
DURATION="${3:-5m}"
RESULTS_DIR="./results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=================================================="
echo "K6 Load Test Suite"
echo "=================================================="
echo "Target: $BASE_URL"
echo "VUs: $VUS"
echo "Duration: $DURATION"
echo "Timestamp: $TIMESTAMP"
echo "=================================================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ Error: k6 is not installed"
    echo "Install: brew install k6 (macOS) or visit https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

# Test scripts in execution order
TESTS=(
    "01-baseline.js:Baseline API Performance"
    "02-backend-latency.js:Backend Latency Simulation"
    "03-server-crash.js:Server Error Simulation"
    "04-database-failure.js:Database Failure Simulation"
    "05-auth-failure.js:Authentication Failure"
    "06-large-payload.js:Large Payload Response"
    "07-progressive-degradation.js:Progressive Degradation"
    "08-mixed-realistic.js:Mixed Realistic Traffic"
    "09-spike-test.js:Spike Test"
    "10-endurance-test.js:Endurance Test (30min)"
    "11-frontend-performance.js:Frontend Performance"
)

PASSED=0
FAILED=0

for test_entry in "${TESTS[@]}"; do
    IFS=':' read -r script description <<< "$test_entry"
    
    echo ""
    echo "=================================================="
    echo "Running: $description"
    echo "Script: $script"
    echo "=================================================="
    
    result_file="$RESULTS_DIR/${script%.js}_${TIMESTAMP}.json"
    summary_file="$RESULTS_DIR/${script%.js}_${TIMESTAMP}_summary.json"
    
    if k6 run \
        --vus "$VUS" \
        --duration "$DURATION" \
        -e BASE_URL="$BASE_URL" \
        --out json="$result_file" \
        --summary-export="$summary_file" \
        "test_data/$script"; then
        
        echo "✅ PASSED: $description"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAILED: $description"
        FAILED=$((FAILED + 1))
    fi
    
    # Small pause between tests
    sleep 5
done

echo ""
echo "=================================================="
echo "Test Suite Summary"
echo "=================================================="
echo "Total Tests: $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Results Directory: $RESULTS_DIR"
echo "=================================================="

if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
