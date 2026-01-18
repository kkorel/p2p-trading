# P2P Energy Trading MVP - Beckn v2

A complete Phase-1 implementation of Beckn v2 P2P Energy Trading supporting the full trade placement flow with trust-based matching.

## Overview

This MVP implements the consumer-side (BAP) trading flow with mock CDS and BPP services, enabling local end-to-end testing of the Beckn v2 P2P energy trading protocol.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Prosumer App (BAP + BPP)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Client APIs (/api/discover, select, init, confirm)     │  │
│  │ • Callback endpoints (/callbacks/on_*)                    │  │
│  │ • Seller APIs (/seller/*)                                 │  │
│  │ • Beckn BPP endpoints (/select, /init, /confirm, /status) │  │
│  │ • Matching algorithm (price + trust + time window)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │              │
         ┌─────────────────┘              │
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│   CDS Mock      │              │   PostgreSQL    │
│   :4001         │              │   :5432         │
│                 │              ├─────────────────┤
│ • /discover     │              │   Redis         │
│ • Catalog sync  │              │   :6379         │
└─────────────────┘              └─────────────────┘
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
- Docker and Docker Compose (for PostgreSQL and Redis)

### Installation

```bash
# Clone the repository
cd p2p-trading

# Install dependencies
npm install

# Start Docker services (PostgreSQL + Redis)
npm run docker:up

# Initialize database schema and generate Prisma client
npm run db:push
npm run db:generate

# Seed the database with sample data
npm run seed

# Start all services
npm run dev
```

### One-Command Setup

For a complete setup in one command:

```bash
npm run setup
```

This will:
1. Start PostgreSQL and Redis containers
2. Wait for services to be ready
3. Push the database schema
4. Generate Prisma client
5. Seed the database

### Services

| Service | Port | Description |
|---------|------|-------------|
| Prosumer | 4000 | Combined BAP (buyer) + BPP (seller) |
| CDS | 4001 | Catalog Discovery Service (mock) |
| PostgreSQL | 5432 | Persistent database |
| Redis | 6379 | Transaction state cache |

### Run the Demo Flow

```bash
# Execute the full trade flow
npm run flow

# Or directly
bash scripts/run-flow.sh
```

## Docker Commands

```bash
# Start PostgreSQL and Redis
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Database management
npm run db:push        # Push schema changes
npm run db:migrate     # Run migrations (production)
npm run db:migrate:dev # Create migration (development)
npm run db:studio      # Open Prisma Studio GUI
```

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://p2p_user:p2p_password@localhost:5432/p2p_trading | PostgreSQL connection string |
| REDIS_URL | redis://localhost:6379 | Redis connection string |
| BAP_PORT | 4000 | Prosumer app port |
| CDS_PORT | 4001 | CDS Mock port |
| CALLBACK_DELAY | 100 | Async callback delay (ms) |
| MATCH_WEIGHT_PRICE | 0.40 | Price weight in matching |
| MATCH_WEIGHT_TRUST | 0.35 | Trust weight in matching |
| MATCH_WEIGHT_TIME | 0.25 | Time window weight |

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

### Health Check

```bash
# Check prosumer health
curl http://localhost:4000/health

# Check CDS health
curl http://localhost:4001/health
```

Response includes PostgreSQL and Redis connectivity status:
```json
{
  "status": "ok",
  "service": "prosumer",
  "roles": ["bap", "bpp"],
  "postgres": "connected",
  "redis": "connected",
  "timestamp": "2026-01-18T12:00:00.000Z"
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

### PostgreSQL Tables (via Prisma)

```sql
-- Provider trust tracking
providers (id, name, trust_score, total_orders, successful_orders, created_at, updated_at)

-- Catalog items (energy resources)
catalog_items (id, provider_id, source_type, delivery_mode, available_qty, meter_id, production_windows_json, created_at, updated_at)

-- Catalog offers (trade offers)
catalog_offers (id, item_id, provider_id, price_value, currency, max_qty, time_window_start, time_window_end, pricing_model, settlement_type, created_at, updated_at)

-- Offer blocks (1 block = 1 kWh unit)
offer_blocks (id, offer_id, item_id, provider_id, status, order_id, transaction_id, price_value, currency, created_at, reserved_at, sold_at)

-- Orders
orders (id, transaction_id, provider_id, selected_offer_id, status, total_qty, total_price, currency, items_json, quote_json, created_at, updated_at)

-- Event log for correlation
events (id, transaction_id, message_id, action, direction, raw_json, created_at)
```

### Redis Keys

- `txn:{transaction_id}` - Transaction state (TTL: 24h)
- `msg:{direction}:{message_id}` - Message deduplication (TTL: 7d)
- `txn:all` - Set of all transaction IDs

## Seed Data

The seeding script creates:

**Providers:**
- `provider-solar-alpha` - Trust score: 0.85 (established)
- `provider-solar-beta` - Trust score: 0.60 (newer)

**Items:**
- 2 Solar energy items (100 kWh and 150 kWh available)

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
│   ├── shared/          # Shared types, utilities, Prisma schema, Redis client
│   │   ├── prisma/      # Prisma schema and migrations
│   │   └── src/
│   │       ├── db/      # Database clients (Prisma, Redis)
│   │       ├── types/   # TypeScript types
│   │       └── matching/ # Matching algorithm
│   ├── cds-mock/        # Catalog Discovery Service
│   └── bap/             # Prosumer App (BAP + BPP combined)
├── postman/
│   ├── collection.json  # Postman collection
│   └── environment.json # Environment variables
├── scripts/
│   └── run-flow.sh      # Demo flow script
├── docker-compose.yml   # PostgreSQL + Redis services
├── .env.example         # Environment template
├── package.json         # Monorepo configuration
└── README.md
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
- PostgreSQL persistence
- Redis caching for transaction state
- Health checks with database connectivity status
- Graceful shutdown

**Not Included (Phase-2+):**
- DISCOM/utility integration
- Settlement and billing
- Deviation penalties
- Meter-verified fulfillment
- Real-time energy delivery tracking

## Troubleshooting

### Database Connection Issues

```bash
# Check if Docker containers are running
docker ps

# Restart Docker services
npm run docker:down
npm run docker:up

# Check PostgreSQL logs
docker logs p2p-postgres

# Check Redis logs
docker logs p2p-redis
```

### Reset Database

```bash
# Clear old SQLite databases (no longer used)
npm run clean:db

# Re-seed PostgreSQL
npm run seed
```

### Generate Prisma Client

If you see Prisma client errors:

```bash
npm run db:generate
```

## License

MIT
