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

- Node.js >= 20
- Docker and Docker Compose

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd p2p-trading

# Copy environment template
cp .env.example .env

# Edit .env with your configuration (especially GOOGLE_CLIENT_ID)
nano .env

# Install dependencies
npm install

# Start PostgreSQL + Redis
npm run docker:up

# Initialize database
npm run db:push
npm run db:generate

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

## Features

### Trust Score System

A credit-score-like reputation system that governs trading privileges:

| Trust Score | Tier | Trade Limit | Description |
|------------|------|-------------|-------------|
| < 0.3 | 🆕 New | 10% | New users, complete first trade |
| 0.3 - 0.49 | 🌱 Starter | 10% | Building reputation |
| 0.5 - 0.69 | 🥉 Bronze | 40% | Established trader |
| 0.7 - 0.84 | ⭐ Silver | 60% | Good track record |
| 0.85 - 0.94 | 🏆 Gold | 80% | Excellent reputation |
| ≥ 0.95 | 💎 Platinum | 100% | Full trading privileges |

### Meter PDF Analysis

Upload your electricity meter reading PDF to:
- Auto-extract and set your production capacity
- Get +10% trust score bonus
- Uses OpenRouter LLM with regex fallback

### Escrow System

- Funds are held in escrow when buyer confirms order
- Seller receives payment after DISCOM verifies delivery
- Partial delivery: seller receives proportional payment
- Cancellation: 90% refund to buyer, 5% to seller, 5% to platform

### Order Cancellation

- Can cancel up to 30 minutes before delivery start time
- 10% penalty fee (5% to seller, 5% to platform)
- Trust score penalty for cancellations

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

## Production Deployment

### Using Docker Compose

```bash
# Build and deploy all services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

Create a `.env` file from `.env.example` and configure:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `SESSION_SECRET` - Secure session secret (32+ characters)

**Optional:**
- `OPENROUTER_API_KEY` - For meter PDF analysis
- `DEV_MODE` - Set to `false` in production (protects demo endpoints)

### Health Checks

All services expose health check endpoints:
- BAP: `GET /health`
- CDS: `GET /health`

### Scaling Considerations

- Use a managed PostgreSQL instance for production
- Use Redis Cluster or managed Redis for high availability
- Configure proper CORS headers for your domain
- Set up SSL/TLS termination via reverse proxy (nginx/traefik)

## Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # With coverage report
```

### Test Suites
- **Trust Engine**: Penalty calculations, tier limits
- **Payment Logic**: Escrow, cancellation, partial delivery
- **Concurrency**: Block claiming race conditions
- **E2E**: Full trading flows
- **Integration**: API endpoints

## Project Structure

```
p2p-trading/
├── packages/
│   ├── web/              # Next.js frontend
│   │   └── src/
│   │       ├── app/      # Pages (buy, sell, orders, profile)
│   │       ├── components/
│   │       ├── contexts/ # Auth, Balance contexts
│   │       └── lib/      # API client
│   ├── bap/              # Prosumer API (BAP + BPP)
│   │   └── src/
│   │       ├── routes.ts        # Buyer APIs
│   │       ├── seller-routes.ts # Seller APIs
│   │       ├── auth-routes.ts   # Authentication
│   │       ├── discom-mock.ts   # DISCOM verification
│   │       └── meter-analyzer.ts # PDF analysis
│   ├── cds-mock/         # Catalog Discovery Service
│   └── shared/           # Shared types, Prisma, Redis
│       ├── prisma/schema.prisma
│       └── src/
│           ├── trust/    # Trust score engine
│           ├── auth/     # Google OAuth, sessions
│           └── db/       # Database utilities
├── docker-compose.yml        # Development (DB + Redis)
├── docker-compose.prod.yml   # Production (full stack)
├── .env.example             # Environment template
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
| GET `/api/status/:transactionId` | Get order status |

### Buyer APIs
| Endpoint | Description |
|----------|-------------|
| GET `/api/my-orders` | Get buyer's orders |
| POST `/api/transactions` | Create new transaction |

### Seller APIs
| Endpoint | Description |
|----------|-------------|
| GET `/seller/profile` | Get seller profile & offers |
| POST `/seller/offers/direct` | Create energy offer |
| DELETE `/seller/offers/:id` | Delete an offer |
| GET `/seller/my-orders` | List incoming orders |

### Authentication
| Endpoint | Description |
|----------|-------------|
| GET `/auth/config` | Get OAuth config |
| POST `/auth/google` | Authenticate with Google |
| POST `/auth/logout` | Logout current session |
| GET `/auth/me` | Get current user |
| PUT `/auth/profile` | Update profile |
| POST `/auth/analyze-meter` | Analyze meter PDF |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT
