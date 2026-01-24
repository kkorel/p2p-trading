# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/bap ./packages/bap

# Install all dependencies
RUN npm ci --only=production=false

# Generate Prisma client
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build shared first, then bap
RUN npm run build --workspace=@p2p/shared || true
RUN npm run build --workspace=@p2p/bap || true

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 prosumer

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/bap ./packages/bap
COPY --from=builder /app/package*.json ./

# Create uploads directory with proper permissions
RUN mkdir -p /app/packages/bap/uploads/meter-pdfs && \
    chown -R prosumer:nodejs /app/packages/bap/uploads

USER prosumer

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV BAP_PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the app with dumb-init (use ts-node for now, switch to compiled JS for production)
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "ts-node", "packages/bap/src/index.ts"]
