FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/cds-mock ./packages/cds-mock

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build shared first, then cds
RUN npm run build --workspace=@p2p/shared
RUN npm run build --workspace=@p2p/cds-mock

# Expose port
EXPOSE 4001

# Set environment
ENV NODE_ENV=production
ENV PORT=4001

# Start the app
CMD ["node", "packages/cds-mock/dist/index.js"]
