#!/bin/bash

# P2P Energy Trading - Phase-3 Flow Demo Script
# This script demonstrates the Phase-3 verification and settlement flow:
# 1. Run Phase-1 to create an ACTIVE order (or use existing order)
# 2. Start verification
# 3. Submit proofs
# 4. Accept verification
# 5. Start settlement
# 6. Check settlement status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service URLs
BAP_URL="${BAP_URL:-http://localhost:4000}"

# Time window (use tomorrow's date to match seed data)
TOMORROW=$(date -u -v+1d +%Y-%m-%d 2>/dev/null || date -u -d "+1 day" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)

# Check if services are running
echo -e "${YELLOW}Checking service health...${NC}"

if curl -s "${BAP_URL}/health" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} BAP is running"
else
    echo -e "  ${RED}✗${NC} BAP is not responding at $BAP_URL"
    exit 1
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     P2P Energy Trading - Phase-3 Flow Demo                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if order_id is provided as argument, otherwise try to get from Phase-1
if [ -z "$1" ]; then
    echo -e "${YELLOW}No order_id provided. Running Phase-1 flow first...${NC}"
    echo ""
    
    # Run Phase-1 flow (simplified)
    echo -e "${BLUE}Running Phase-1: Creating ACTIVE order...${NC}"
    
    # Discover
    DISCOVER_RESPONSE=$(curl -s -X POST "$BAP_URL/api/discover" \
      -H "Content-Type: application/json" \
      -d "{\"sourceType\":\"SOLAR\",\"minQuantity\":20,\"timeWindow\":{\"startTime\":\"${TOMORROW}T11:00:00Z\",\"endTime\":\"${TOMORROW}T15:00:00Z\"}}")
    
    TRANSACTION_ID=$(echo "$DISCOVER_RESPONSE" | grep -o '"transaction_id":"[^"]*"' | cut -d'"' -f4 | tr -d '\n' | tr -d '\r')
    
    if [ -z "$TRANSACTION_ID" ]; then
        echo -e "${RED}Failed to get transaction_id from Phase-1${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Transaction ID: $TRANSACTION_ID${NC}"
    sleep 0.5
    
    # Select
    SELECT_RESPONSE=$(curl -s -X POST "$BAP_URL/api/select" \
      -H "Content-Type: application/json" \
      -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"quantity\":30,\"autoMatch\":true,\"requestedTimeWindow\":{\"startTime\":\"${TOMORROW}T11:00:00Z\",\"endTime\":\"${TOMORROW}T15:00:00Z\"}}")
    
    sleep 0.5
    
    # Init
    INIT_RESPONSE=$(curl -s -X POST "$BAP_URL/api/init" \
      -H "Content-Type: application/json" \
      -d "{\"transaction_id\":\"${TRANSACTION_ID}\"}")
    
    sleep 0.5
    
    # Get order ID
    TX_STATE=$(curl -s "$BAP_URL/api/transactions/$TRANSACTION_ID")
    ORDER_ID=$(echo "$TX_STATE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 | tr -d '\n' | tr -d '\r')
    
    if [ -z "$ORDER_ID" ]; then
        echo -e "${RED}Could not get order ID from Phase-1${NC}"
        exit 1
    fi
    
    # Confirm
    CONFIRM_RESPONSE=$(curl -s -X POST "$BAP_URL/api/confirm" \
      -H "Content-Type: application/json" \
      -d "{\"transaction_id\":\"${TRANSACTION_ID}\",\"order_id\":\"${ORDER_ID}\"}")
    
    sleep 0.5
    
    echo -e "${GREEN}Phase-1 complete. Order ID: $ORDER_ID${NC}"
    echo ""
else
    ORDER_ID="$1"
    echo -e "${GREEN}Using provided order ID: $ORDER_ID${NC}"
    echo ""
fi

# Phase-3: Start Verification
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase-3 Step 1: Start Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

VERIFICATION_START_RESPONSE=$(curl -s -X POST "$BAP_URL/phase3/orders/$ORDER_ID/verification/start" \
  -H "Content-Type: application/json" \
  -d "{\"verification_window\":{\"startTime\":\"${TOMORROW}T11:00:00Z\",\"endTime\":\"${TOMORROW}T15:00:00Z\"},\"required_proofs\":[{\"type\":\"METER_READING\",\"source\":\"meter-123\",\"deadline\":\"${TOMORROW}T16:00:00Z\"}],\"expected_quantity\":{\"value\":30,\"unit\":\"kWh\"},\"tolerance_rules\":{\"max_deviation_percent\":5.0,\"min_quantity\":28.5}}")

echo -e "${GREEN}Response:${NC}"
echo "$VERIFICATION_START_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VERIFICATION_START_RESPONSE"
echo ""

VERIFICATION_CASE_ID=$(echo $VERIFICATION_START_RESPONSE | grep -o '"verification_case_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$VERIFICATION_CASE_ID" ]; then
    echo -e "${YELLOW}Note: Verification case may already exist (idempotent)${NC}"
    # Try to get from state
    STATE_RESPONSE=$(curl -s "$BAP_URL/phase3/orders/$ORDER_ID")
    VERIFICATION_CASE_ID=$(echo $STATE_RESPONSE | grep -o '"case_id":"[^"]*"' | cut -d'"' -f4)
fi

sleep 0.5

# Phase-3: Submit Proofs
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase-3 Step 2: Submit Proofs${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SUBMIT_PROOFS_RESPONSE=$(curl -s -X POST "$BAP_URL/phase3/orders/$ORDER_ID/proofs" \
  -H "Content-Type: application/json" \
  -d "{\"proofs\":[{\"type\":\"METER_READING\",\"source\":\"meter-123\",\"timestamp\":\"${TOMORROW}T12:00:00Z\",\"value\":{\"quantity\":15.5,\"unit\":\"kWh\"},\"metadata\":{\"reading_type\":\"START\"}},{\"type\":\"METER_READING\",\"source\":\"meter-123\",\"timestamp\":\"${TOMORROW}T14:30:00Z\",\"value\":{\"quantity\":14.5,\"unit\":\"kWh\"},\"metadata\":{\"reading_type\":\"END\"}}]}")

echo -e "${GREEN}Response:${NC}"
echo "$SUBMIT_PROOFS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SUBMIT_PROOFS_RESPONSE"
echo ""

sleep 0.5

# Phase-3: Accept Verification
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase-3 Step 3: Accept Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

ACCEPT_VERIFICATION_RESPONSE=$(curl -s -X POST "$BAP_URL/phase3/orders/$ORDER_ID/verification/accept" \
  -H "Content-Type: application/json" \
  -d '{}')

echo -e "${GREEN}Response:${NC}"
echo "$ACCEPT_VERIFICATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ACCEPT_VERIFICATION_RESPONSE"
echo ""

sleep 0.5

# Phase-3: Start Settlement
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase-3 Step 4: Start Settlement${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SETTLEMENT_START_RESPONSE=$(curl -s -X POST "$BAP_URL/phase3/orders/$ORDER_ID/settlement/start" \
  -H "Content-Type: application/json" \
  -d "{\"settlement_type\":\"DAILY\",\"period\":{\"startTime\":\"${TOMORROW}T00:00:00Z\",\"endTime\":\"${TOMORROW}T23:59:59Z\"}}")

echo -e "${GREEN}Response:${NC}"
echo "$SETTLEMENT_START_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SETTLEMENT_START_RESPONSE"
echo ""

SETTLEMENT_ID=$(echo $SETTLEMENT_START_RESPONSE | grep -o '"settlement_id":"[^"]*"' | cut -d'"' -f4)

sleep 1.0

# Phase-3: Get Final State
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase-3 Step 5: Get Verification & Settlement State${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

FINAL_STATE=$(curl -s "$BAP_URL/phase3/orders/$ORDER_ID")
echo -e "${GREEN}Final State:${NC}"
echo "$FINAL_STATE" | python3 -m json.tool 2>/dev/null || echo "$FINAL_STATE"
echo ""

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Phase-3 Flow Complete!                                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Order ID:              ${BLUE}$ORDER_ID${NC}"
if [ -n "$VERIFICATION_CASE_ID" ]; then
    echo -e "Verification Case ID:  ${BLUE}$VERIFICATION_CASE_ID${NC}"
fi
if [ -n "$SETTLEMENT_ID" ]; then
    echo -e "Settlement ID:         ${BLUE}$SETTLEMENT_ID${NC}"
fi
echo ""
