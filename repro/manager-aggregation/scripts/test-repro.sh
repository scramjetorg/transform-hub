#!/bin/bash
# test-repro.sh — Manager aggregation repro test runner
#
# Queries the MultiManager proxy and direct hub endpoints, then
# compares results. Expected failure: the Manager proxy should show
# connected hubs/sequences, but returns empty [] while direct hub
# endpoints show sequences.
#
# Exit code: 1 if the bug is reproduced or another assertion fails.
#            0 if Manager aggregation is non-empty (bug may be fixed).

set -euo pipefail

MM_URL="${MM_URL:-http://mm:3000}"
HUB1_URL="${HUB1_URL:-http://hub-1:8001}"
HUB2_URL="${HUB2_URL:-http://hub-2:8002}"
MANAGER_ID="${MANAGER_ID:-mgr1}"
API_BASE="/api/v1"
MANAGER_PATH="cpm/${MANAGER_ID}"

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1"; }

echo "=== Manager Aggregation Repro Test ==="
echo "MM:    ${MM_URL}"
echo "Hub-1: ${HUB1_URL}"
echo "Hub-2: ${HUB2_URL}"
echo ""

# ------------------------------------------------------------------
# 1. Check MultiManager /version to confirm stack is up
# ------------------------------------------------------------------
echo "--- [1] Stack health ---"
MM_VERSION=$(curl -sf "${MM_URL}${API_BASE}/version" 2>/dev/null || true)
if echo "$MM_VERSION" | jq -e '.service' >/dev/null 2>&1; then
    pass "MultiManager is responding"
else
    fail "MultiManager not reachable"
fi

HUB1_VERSION=$(curl -sf "${HUB1_URL}${API_BASE}/version" 2>/dev/null || true)
if echo "$HUB1_VERSION" | jq -e '.service' >/dev/null 2>&1; then
    pass "Hub-1 is responding"
else
    fail "Hub-1 not reachable"
fi

HUB2_VERSION=$(curl -sf "${HUB2_URL}${API_BASE}/version" 2>/dev/null || true)
if echo "$HUB2_VERSION" | jq -e '.service' >/dev/null 2>&1; then
    pass "Hub-2 is responding"
else
    fail "Hub-2 not reachable"
fi

echo ""

# ------------------------------------------------------------------
# 2. Query Manager /list via MultiManager proxy
# ------------------------------------------------------------------
echo "--- [2] Manager /list (via MM proxy) ---"
MM_LIST=$(curl -sf "${MM_URL}${API_BASE}/${MANAGER_PATH}${API_BASE}/list" 2>/dev/null || echo "FETCH_ERROR")
MM_LIST_COUNT=$(echo "$MM_LIST" | jq 'length' 2>/dev/null || echo "parse_error")
echo "  MM proxy list count: ${MM_LIST_COUNT}"
echo "  MM proxy list data:  $(echo "$MM_LIST" | jq -c '.' 2>/dev/null || echo 'parse error')"

# ------------------------------------------------------------------
# 3. Query Manager /all_sequences via MultiManager proxy
# ------------------------------------------------------------------
echo "--- [3] Manager /all_sequences (via MM proxy) ---"
MM_SEQUENCES=$(curl -sf "${MM_URL}${API_BASE}/${MANAGER_PATH}${API_BASE}/all_sequences" 2>/dev/null || echo "FETCH_ERROR")
MM_SEQ_COUNT=$(echo "$MM_SEQUENCES" | jq 'length' 2>/dev/null || echo "parse_error")
echo "  MM proxy all_sequences count: ${MM_SEQ_COUNT}"
echo "  MM proxy all_sequences data:  $(echo "$MM_SEQUENCES" | jq -c '.' 2>/dev/null || echo 'parse error')"

# ------------------------------------------------------------------
# 4. Query Manager /instances via MultiManager proxy
# ------------------------------------------------------------------
echo "--- [4] Manager /instances (via MM proxy) ---"
MM_INSTANCES=$(curl -sf "${MM_URL}${API_BASE}/${MANAGER_PATH}${API_BASE}/instances" 2>/dev/null || echo "FETCH_ERROR")
MM_INST_COUNT=$(echo "$MM_INSTANCES" | jq 'length' 2>/dev/null || echo "parse_error")
echo "  MM proxy instances count: ${MM_INST_COUNT}"
echo "  MM proxy instances data:  $(echo "$MM_INSTANCES" | jq -c '.' 2>/dev/null || echo 'parse error')"

echo ""

# ------------------------------------------------------------------
# 5. Query direct hub sequence endpoints (should be non-empty)
# ------------------------------------------------------------------
echo "--- [5] Direct hub sequences ---"
for label in "hub-1" "hub-2"; do
    case "$label" in
        "hub-1") URL="${HUB1_URL}" ;;
        "hub-2") URL="${HUB2_URL}" ;;
    esac
    HUB_SEQ=$(curl -sf "${URL}${API_BASE}/sequence" 2>/dev/null || echo "FETCH_ERROR")
    HUB_SEQ_COUNT=$(echo "$HUB_SEQ" | jq 'length' 2>/dev/null || echo "parse_error")
    echo "  ${label} sequences count: ${HUB_SEQ_COUNT}"
    echo "  ${label} sequences data:  $(echo "$HUB_SEQ" | jq -c '.' 2>/dev/null || echo 'parse error')"
done

echo ""

# ------------------------------------------------------------------
# 6. Assert the bug: proxy returns empty, direct shows data
# ------------------------------------------------------------------
echo "--- [6] Assertions ---"

# Bug check A: MM proxy list should be non-empty (has 2 hubs)
if [ "$MM_LIST_COUNT" = "0" ] || [ "$MM_LIST_COUNT" = "parse_error" ]; then
    fail "Expected MM proxy /list to show hubs, got count=${MM_LIST_COUNT}"
    echo "  → This is BUG 0rail/transform-hub#15: aggregation returns empty"
else
    pass "MM proxy /list shows ${MM_LIST_COUNT} hub(s)"
fi

# Bug check B: MM proxy all_sequences should be non-empty
if [ "$MM_SEQ_COUNT" = "0" ] || [ "$MM_SEQ_COUNT" = "parse_error" ]; then
    fail "Expected MM proxy /all_sequences to show sequences, got count=${MM_SEQ_COUNT}"
    echo "  → This is BUG 0rail/transform-hub#15: aggregation returns empty"
else
    pass "MM proxy /all_sequences shows ${MM_SEQ_COUNT} sequence(s)"
fi

# Bug check C: MM proxy instances should be non-empty (if any started)
if [ "$MM_INST_COUNT" = "0" ] || [ "$MM_INST_COUNT" = "parse_error" ]; then
    echo "  (no instances expected unless startup config triggers them)"
fi

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [ "$FAIL" -gt 0 ]; then
    echo "→ Bug reproduced: Manager aggregation returns empty state"
    exit 1
fi

# If all passed, the bug might have been fixed
echo "→ All assertions passed — the bug may have been fixed."
exit 0
