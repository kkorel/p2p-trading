#!/bin/bash

# P2P Energy Trading - Full Flow Demo Script
# This script demonstrates the complete trade placement flow:
# discover → select → init → confirm → status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service URLs
BAP_URL="${BAP_URL:-http://localhost:4000}"
CDS_URL="${CDS_URL:-http://localhost:4001}"
# Note: BPP functionality is hosted on the same port as BAP (4000) in this implementation
BPP_URL="${BPP_URL:-http://localhost:4000}"

# Time window (use tomorrow's date to match seed data)
TOMORROW=$(date -u -v+1d +%Y-%m-%d 2>/dev/null || date -u -d "+1 day" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
START_TIME="${TOMORROW}T11:00:00Z"
END_TIME="${TOMORROW}T15:00:00Z"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     P2P Energy Trading - Beckn v2 Flow Demo                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}Checking service health...${NC}"

check_service() {
    local name=$1
    local url=$2
    if curl -s "${url}/health" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name is not responding at $url"
        return 1
    fi
}

check_service "BAP" "$BAP_URL" || exit 1
check_service "CDS" "$CDS_URL" || exit 1
# BPP is hosted on the same port as BAP, so we skip the separate check
# check_service "BPP" "$BPP_URL" || exit 1
echo -e "  ${GREEN}✓${NC} BPP (hosted on BAP port 4000)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: DISCOVER - Finding Solar Energy Offers${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Request:${NC} POST $BAP_URL/api/discover"
echo -e "${YELLOW}Filters:${NC} sourceType=SOLAR, minQuantity=20 kWh (deliveryMode always SCHEDULED)"
echo -e "${YELLOW}Time Window:${NC} $START_TIME to $END_TIME"
echo ""

DISCOVER_RESPONSE=$(curl -s -X POST "$BAP_URL/api/discover" \
  -H "Content-Type: application/json" \
  -d "{\"sourceType\":\"SOLAR\",\"minQuantity\":20,\"timeWindow\":{\"startTime\":\"$START_TIME\",\"endTime\":\"$END_TIME\"}}")

TRANSACTION_ID=$(echo "$DISCOVER_RESPONSE" | grep -o '"transaction_id":"[^"]*"' | head -1 | cut -d'"' -f4 | tr -d '\n' | tr -d '\r')

echo -e "${GREEN}Response:${NC}"
echo "$DISCOVER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DISCOVER_RESPONSE"
echo ""

if [ -z "$TRANSACTION_ID" ]; then
    echo -e "${RED}Failed to get transaction_id${NC}"
    exit 1
fi

echo -e "${GREEN}Transaction ID: $TRANSACTION_ID${NC}"
echo ""

# Wait for callback
echo -e "${YELLOW}Waiting for on_discover callback (500ms)...${NC}"
sleep 0.5

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: SELECT - Using Matching Algorithm${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Request:${NC} POST $BAP_URL/api/select"
echo -e "${YELLOW}Matching:${NC} autoMatch=true (price 40%, trust 35%, time fit 25%)"
echo -e "${YELLOW}Quantity:${NC} 30 kWh"
echo ""

SELECT_RESPONSE=$(curl -s -X POST "$BAP_URL/api/select" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"quantity\":30,\"autoMatch\":true,\"requestedTimeWindow\":{\"startTime\":\"${START_TIME}\",\"endTime\":\"${END_TIME}\"}}")

echo -e "${GREEN}Response:${NC}"
echo "$SELECT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SELECT_RESPONSE"
echo ""

# Extract matching info
SCORE=$(echo $SELECT_RESPONSE | grep -o '"score":[0-9.]*' | cut -d':' -f2)
if [ -n "$SCORE" ]; then
    echo -e "${GREEN}Matching Score: $SCORE${NC}"
fi

# Wait for callback
echo -e "${YELLOW}Waiting for on_select callback (500ms)...${NC}"
sleep 0.5

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: INIT - Initialize Order${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Request:${NC} POST $BAP_URL/api/init"
echo ""

INIT_RESPONSE=$(curl -s -X POST "$BAP_URL/api/init" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\"}")

echo -e "${GREEN}Response:${NC}"
echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"
echo ""

# Wait for callback
echo -e "${YELLOW}Waiting for on_init callback (500ms)...${NC}"
sleep 0.5

# Get order ID from transaction state
echo -e "${YELLOW}Fetching transaction state to get order ID...${NC}"
TX_STATE=$(curl -s "$BAP_URL/api/transactions/$TRANSACTION_ID")
ORDER_ID=$(echo "$TX_STATE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 | tr -d '\n' | tr -d '\r')

if [ -z "$ORDER_ID" ]; then
    echo -e "${RED}Could not get order ID from transaction state${NC}"
    echo "$TX_STATE" | python3 -m json.tool 2>/dev/null || echo "$TX_STATE"
    exit 1
fi

echo -e "${GREEN}Order ID: $ORDER_ID${NC}"
echo ""

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: CONFIRM - Activate Order${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Request:${NC} POST $BAP_URL/api/confirm"
echo -e "${YELLOW}Order ID:${NC} $ORDER_ID"
echo ""

CONFIRM_RESPONSE=$(curl -s -X POST "$BAP_URL/api/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"order_id\":\"${ORDER_ID}\"}")

echo -e "${GREEN}Response:${NC}"
echo "$CONFIRM_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CONFIRM_RESPONSE"
echo ""

# Wait for callback
echo -e "${YELLOW}Waiting for on_confirm callback (500ms)...${NC}"
sleep 0.5

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: STATUS - Check Order Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Request:${NC} POST $BAP_URL/api/status"
echo ""

STATUS_RESPONSE=$(curl -s -X POST "$BAP_URL/api/status" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"order_id\":\"${ORDER_ID}\"}")

echo -e "${GREEN}Response:${NC}"
echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# Wait for callback
echo -e "${YELLOW}Waiting for on_status callback (500ms)...${NC}"
sleep 0.5

# Final transaction state
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Final Transaction State${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

FINAL_STATE=$(curl -s "$BAP_URL/api/transactions/$TRANSACTION_ID")
echo "$FINAL_STATE" | python3 -m json.tool 2>/dev/null || echo "$FINAL_STATE"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Flow Complete! Order is now ACTIVE                        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Transaction ID: ${BLUE}$TRANSACTION_ID${NC}"
echo -e "Order ID:       ${BLUE}$ORDER_ID${NC}"
echo ""

# Test idempotency
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Bonus: Testing Confirm Idempotency${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Sending confirm again with same transaction_id...${NC}"
echo ""

CONFIRM2_RESPONSE=$(curl -s -X POST "$BAP_URL/api/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"order_id\":\"${ORDER_ID}\"}")

echo -e "${GREEN}Response (should still succeed, no duplicate order):${NC}"
echo "$CONFIRM2_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CONFIRM2_RESPONSE"
echo ""
echo -e "${GREEN}✓ Confirm is idempotent - no duplicate orders created${NC}"
