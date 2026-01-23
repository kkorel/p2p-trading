# P2P Energy Trading Platform

A peer-to-peer energy trading platform built on the Beckn v2 protocol.

## Overview

This platform enables prosumers (producer-consumers) to buy and sell renewable energy directly with each other, with trust-based matching and secure payment handling.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Prosumer App (BAP + BPP)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Client APIs (/api/discover, select, init, confirm)     │  │
│  │ • Callback endpoints (/callbacks/on_*)                    │  │
│  │ • Seller APIs (/seller/*)                                 │  │
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

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker and Docker Compose

### Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL + Redis
npm run docker:up

# Initialize database
npm run db:push
npm run db:generate

# Seed sample data
npm run seed

# Start all services
npm run dev:all
```

Or use the one-command setup:

```bash
npm run setup
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Web UI | 3000 | Next.js frontend |
| Prosumer | 4000 | BAP (buyer) + BPP (seller) API |
| CDS | 4001 | Catalog Discovery Service |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |

## Usage

1. Open http://localhost:3000
2. Sign in with Google
3. **Buy**: Browse and purchase energy offers
4. **Sell**: Create and manage your energy listings
5. **Orders**: View your purchase and sales history

## Trust Score System

A credit-score-like reputation system that governs trading privileges:

### How It Works

| Trust Score | Tier | Trade Limit | Description |
|------------|------|-------------|-------------|
| < 0.3 | 🆕 New | 10% | New users, complete first trade |
| 0.3 - 0.49 | 🌱 Starter | 10% | Building reputation |
| 0.5 - 0.69 | 🥉 Bronze | 40% | Established trader |
| 0.7 - 0.84 | ⭐ Silver | 60% | Good track record |
| 0.85 - 0.94 | 🏆 Gold | 80% | Excellent reputation |
| ≥ 0.95 | 💎 Platinum | 100% | Full trading privileges |

### Score Changes

**Increases**:
- Successful energy delivery (verified by DISCOM)
- Good meter data quality (via DeepSeek analysis)

**Decreases**:
- Partial delivery: `penalty = 0.10 × (1 - delivered/expected)`
- Failed delivery: -0.10 to trust score
- Order cancellation: -0.05 (within cancellation window)

### DISCOM Mock Service

Simulates utility company verification of energy delivery:
- Runs as background job checking completed orders
- Applies proportional trust updates based on delivery ratio
- Configurable success rate via `DISCOM_SUCCESS_RATE`

### Order Cancellation

Buyers can cancel orders within a configurable window:
- Releases reserved energy blocks back to seller
- Applies trust penalty to buyer
- Follows Beckn `/cancel` → `/on_cancel` flow

### Production Capacity

Users declare their monthly production capacity to determine trade limits:
- Set in profile: "How much electricity do you produce monthly? (kWh)"
- Trade limit = Trust % × Production Capacity
- Example: 30% trust + 500 kWh production = 50 kWh trade limit
- Optional: Upload meter PDF for DeepSeek verification to boost trust

## Development

```bash
# Run all services
npm run dev:all

# Run tests
npm test

# View database
npm run db:studio

# Stop Docker services
npm run docker:down
```

## Testing

```bash
npm test              # All tests (102 tests)
npm run test:unit     # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # With coverage report
```

### Test Suites
- **Trust Engine**: 26 tests for penalty calculations, tier limits
- **Concurrency**: Block claiming race conditions
- **E2E**: Full trading flows
- **Integration**: API endpoints

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://p2p_user:p2p_password@localhost:5432/p2p_trading
REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id

# Trust Score System
TRUST_DEFAULT_SCORE=0.3      # Starting trust for new users
TRUST_DEFAULT_LIMIT=10       # Starting trade limit (kWh)
TRUST_SUCCESS_BONUS=0.05     # Bonus for successful delivery
TRUST_FAILURE_PENALTY=0.10   # Max penalty for failed delivery
TRUST_METER_BONUS=0.10       # Bonus for good meter data
TRUST_CANCEL_PENALTY=0.05    # Penalty for buyer cancellation

# DISCOM Mock Service
DISCOM_SUCCESS_RATE=0.85     # 85% delivery success rate
DISCOM_CHECK_INTERVAL_MS=60000  # Check interval (default: 1 min)

# Order Cancellation
CANCEL_WINDOW_MINUTES=30     # Time window for cancellation

# DeepSeek LLM (for meter analysis)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## Project Structure

```
p2p-trading/
├── packages/
│   ├── web/          # Next.js frontend
│   │   └── src/app/
│   │       ├── profile/  # Trust badge display
│   │       ├── orders/   # Order cancellation
│   │       └── sell/     # Seller dashboard
│   ├── bap/          # Prosumer API (BAP + BPP)
│   │   └── src/
│   │       ├── seller-routes.ts  # Cancel route
│   │       └── discom-mock.ts    # DISCOM verification
│   ├── cds-mock/     # Catalog Discovery Service
│   └── shared/       # Shared types, Prisma, Redis
│       ├── prisma/schema.prisma  # Trust models
│       └── src/trust/            # Trust engine
├── scripts/          # Utility scripts
├── docker-compose.yml
└── package.json
```

## API Endpoints

### Beckn Protocol
| Endpoint | Description |
|----------|-------------|
| POST `/api/discover` | Search for energy offers |
| POST `/api/select` | Select an offer |
| POST `/api/init` | Initialize order |
| POST `/api/confirm` | Confirm purchase |
| POST `/api/cancel` | Cancel order (buyer) |

### Seller APIs
| Endpoint | Description |
|----------|-------------|
| GET `/seller/profile` | Get seller profile & offers |
| POST `/seller/offers` | Create new energy offer |
| DELETE `/seller/offers/:id` | Delete an offer |
| GET `/seller/orders` | List incoming orders |

## License

MIT

