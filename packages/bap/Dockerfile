FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy only needed packages
COPY packages/shared ./packages/shared
COPY packages/bap ./packages/bap

# Create dummy package.json for other workspaces to satisfy npm
RUN mkdir -p packages/cds-mock packages/web
RUN echo '{"name":"@p2p/cds-mock","version":"1.0.0"}' > packages/cds-mock/package.json
RUN echo '{"name":"@p2p/web","version":"1.0.0","private":true}' > packages/web/package.json

# Install dependencies
RUN npm ci --ignore-scripts

# Generate Prisma client for Linux
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build shared first, then bap
RUN echo "=== Building shared package ===" && npm run build --workspace=@p2p/shared || (echo "Shared build failed!" && exit 1)
RUN echo "=== Building bap package ===" && npm run build --workspace=@p2p/bap || (echo "BAP build failed!" && exit 1)

# Fix: Update shared package.json to point to compiled JS for production
RUN cd packages/shared && \
    sed -i 's|"main": "src/index.ts"|"main": "dist/index.js"|' package.json && \
    sed -i 's|"types": "src/index.ts"|"types": "dist/index.d.ts"|' package.json

# Copy Prisma generated client to dist (compiled code expects it at ../generated relative to dist/db)
RUN cp -r packages/shared/src/generated packages/shared/dist/generated

# Verify build output exists
RUN echo "=== Checking build output ===" && ls -la packages/bap/ && ls -la packages/bap/dist/ && echo "Build successful: dist folder exists"

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Start script: run migrations then start app
# Migrations need to run at startup (not build) because DATABASE_URL is only available at runtime
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./packages/shared/prisma/schema.prisma && node packages/bap/dist/bap/src/index.js"]
