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
npm test              # All tests
npm run test:unit     # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # With coverage report
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://p2p_user:p2p_password@localhost:5432/p2p_trading
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your-google-client-id
```

## Project Structure

```
p2p-trading/
├── packages/
│   ├── web/          # Next.js frontend
│   ├── bap/          # Prosumer API (BAP + BPP)
│   ├── cds-mock/     # Catalog Discovery Service
│   └── shared/       # Shared types, Prisma, Redis
├── scripts/          # Utility scripts
├── docker-compose.yml
└── package.json
```

## License

MIT
