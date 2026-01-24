# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/cds-mock ./packages/cds-mock

# Install all dependencies
RUN npm ci --only=production=false

# Generate Prisma client
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build shared first, then cds
RUN npm run build --workspace=@p2p/shared || true
RUN npm run build --workspace=@p2p/cds-mock || true

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cds

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/cds-mock ./packages/cds-mock
COPY --from=builder /app/package*.json ./

USER cds

# Expose port
EXPOSE 4001

# Set environment
ENV NODE_ENV=production
ENV CDS_PORT=4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

# Start the app with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "ts-node", "packages/cds-mock/src/index.ts"]
