FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/shared ./packages/shared
COPY packages/bap ./packages/bap

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build shared first, then bap
RUN npm run build --workspace=@p2p/shared
RUN npm run build --workspace=@p2p/bap

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Start the app
CMD ["node", "packages/bap/dist/index.js"]
