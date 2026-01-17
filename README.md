# P2P Energy Trading MVP - Beckn v2

A complete Phase-1 implementation of Beckn v2 P2P Energy Trading supporting the full trade placement flow with trust-based matching.

## Overview

This MVP implements the consumer-side (BAP) trading flow with mock CDS and BPP services, enabling local end-to-end testing of the Beckn v2 P2P energy trading protocol.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Consumer (BAP)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Client APIs (/api/discover, select, init, confirm)     │  │
│  │ • Callback endpoints (/callbacks/on_*)                    │  │
│  │ • Matching algorithm (price + trust + time window)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 │                 ▼
┌─────────────────┐        │        ┌─────────────────┐
│   CDS Mock      │        │        │   BPP Mock      │
│                 │        │        │                 │
│ • /discover     │        │        │ • /select       │
│ • JSONPath      │        │        │ • /init         │
│   filtering     │        │        │ • /confirm      │
│ • Catalog cache │        │        │ • /status       │
└─────────────────┘        │        │ • Order mgmt    │
         │                 │        └─────────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                    Async Callbacks
                    (on_discover, on_select, etc.)
```

### Flow

```
discover → on_discover (catalog with offers)
       ↓
select  → on_select (offer validated, quote generated)
       ↓
init    → on_init (order created, status: PENDING)
       ↓
confirm → on_confirm (order activated, status: ACTIVE)
       ↓
status  → on_status (current order status + fulfillment)
```

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
# Clone the repository
cd p2p-trading

# Install dependencies
npm install

# Seed the databases with sample data
npm run seed

# Start all services
npm run dev
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| BAP     | 4000 | Consumer application platform |
| CDS     | 4001 | Catalog discovery service (mock) |
| BPP     | 4002 | Provider platform (mock) |

### Run the Demo Flow

```bash
# Execute the full trade flow
npm run flow

# Or directly
bash scripts/run-flow.sh
```

## Matching Algorithm

When selecting offers, the BAP applies a multi-criteria weighted scoring algorithm:

| Factor | Weight | Description |
|--------|--------|-------------|
| Price | 40% | Lower price = higher score |
| Trust Score | 35% | Provider reliability (0.0-1.0) |
| Time Window Fit | 25% | Overlap with requested window |

### Example

```
Consumer requests: 30 kWh, 11:00-15:00

Offer A (Alpha): $0.10/kWh, trust=0.85, window=10:00-14:00
  → price_score=0.0, trust=0.85, time_fit=0.75
  → Score = 0.40(0) + 0.35(0.85) + 0.25(0.75) = 0.485

Offer B (Beta): $0.08/kWh, trust=0.60, window=12:00-18:00
  → price_score=1.0, trust=0.60, time_fit=0.75
  → Score = 0.40(1) + 0.35(0.60) + 0.25(0.75) = 0.798

Result: Offer B selected (better price + adequate trust)
```

## API Reference

### BAP Consumer APIs

#### POST /api/discover
Initiate catalog discovery.

```json
{
  "sourceType": "SOLAR",
  "deliveryMode": "INSTANT",
  "minQuantity": 20,
  "timeWindow": {
    "startTime": "2026-01-18T10:00:00Z",
    "endTime": "2026-01-18T16:00:00Z"
  }
}
```

#### POST /api/select
Select an offer (auto-match or manual).

```json
{
  "transaction_id": "uuid",
  "quantity": 30,
  "autoMatch": true,
  "requestedTimeWindow": {
    "startTime": "2026-01-18T11:00:00Z",
    "endTime": "2026-01-18T15:00:00Z"
  }
}
```

#### POST /api/init
Initialize order.

```json
{
  "transaction_id": "uuid"
}
```

#### POST /api/confirm
Confirm and activate order.

```json
{
  "transaction_id": "uuid",
  "order_id": "uuid"
}
```

#### POST /api/status
Query order status.

```json
{
  "transaction_id": "uuid",
  "order_id": "uuid"
}
```

### Callback Endpoints

| Endpoint | Triggered By |
|----------|--------------|
| POST /callbacks/on_discover | CDS after discover |
| POST /callbacks/on_select | BPP after select |
| POST /callbacks/on_init | BPP after init |
| POST /callbacks/on_confirm | BPP after confirm |
| POST /callbacks/on_status | BPP after status |

## Data Model

### SQLite Tables

```sql
-- Provider trust tracking
providers (id, name, trust_score, total_orders, successful_orders)

-- Catalog items (energy resources)
catalog_items (id, provider_id, source_type, delivery_mode, available_qty, ...)

-- Catalog offers (trade offers)
catalog_offers (id, item_id, provider_id, price_value, max_qty, time_window_json, ...)

-- Orders
orders (id, transaction_id, status, selected_offer_id, total_qty, ...)

-- Event log for correlation
events (id, transaction_id, message_id, action, direction, raw_json)
```

## Seed Data

The seeding script creates:

**Providers:**
- `provider-solar-alpha` - Trust score: 0.85 (established)
- `provider-solar-beta` - Trust score: 0.60 (newer)

**Items:**
- 1 Solar energy item (100 kWh available)

**Offers:**
- Morning offer (Alpha): $0.10/kWh, max 50 kWh, 10:00-14:00
- Afternoon offer (Beta): $0.08/kWh, max 100 kWh, 12:00-18:00

## Postman Collection

Import the collection and environment from the `postman/` directory:

1. Open Postman
2. Import `postman/collection.json`
3. Import `postman/environment.json`
4. Select "P2P Energy Trading - Local" environment
5. Run requests in order

## Project Structure

```
p2p-trading/
├── packages/
│   ├── shared/          # Shared types, utilities, matching algorithm
│   ├── cds-mock/        # Catalog Discovery Service
│   ├── bpp-mock/        # Provider Platform (seller)
│   └── bap/             # Application Platform (consumer)
├── postman/
│   ├── collection.json  # Postman collection
│   └── environment.json # Environment variables
├── scripts/
│   └── run-flow.sh      # Demo flow script
├── package.json         # Monorepo configuration
└── README.md
```

## Configuration

Environment variables (optional):

```bash
# Service ports
BAP_PORT=4000
CDS_PORT=4001
BPP_PORT=4002

# Matching algorithm weights
MATCH_WEIGHT_PRICE=0.40
MATCH_WEIGHT_TRUST=0.35
MATCH_WEIGHT_TIME=0.25

# Trust thresholds
MIN_TRUST_THRESHOLD=0.2
DEFAULT_TRUST_SCORE=0.5

# Callback delay (ms)
CALLBACK_DELAY=100
```

## Beckn Compliance

This implementation follows Beckn v2 protocol specifications:

- **Context fields**: version, action, timestamp, message_id, transaction_id, bap_id/uri, bpp_id/uri, ttl, domain
- **Catalog attributes**: EnergyResource (sourceType, deliveryMode, meterId, availableQuantity, productionWindow)
- **Offer attributes**: EnergyTradeOffer (pricingModel=PER_KWH, settlementType=DAILY, price, maxQuantity, timeWindow)
- **Async callbacks**: ACK → callback pattern for all actions

## Phase-1 Scope

**Included:**
- Trade placement flow (discover → confirm)
- Trust-based matching algorithm
- Catalog filtering (JSONPath-like)
- Order management (PENDING → ACTIVE)
- Event logging with correlation
- Idempotent confirm

**Not Included (Phase-2+):**
- DISCOM/utility integration
- Settlement and billing
- Deviation penalties
- Meter-verified fulfillment
- Real-time energy delivery tracking

## License

MIT
