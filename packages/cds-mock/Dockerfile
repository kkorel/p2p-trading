FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy only needed packages
COPY packages/shared ./packages/shared
COPY packages/cds-mock ./packages/cds-mock

# Create dummy package.json for other workspaces to satisfy npm
RUN mkdir -p packages/bap packages/web
RUN echo '{"name":"@p2p/bap","version":"1.0.0"}' > packages/bap/package.json
RUN echo '{"name":"@p2p/web","version":"1.0.0","private":true}' > packages/web/package.json

# Install dependencies
RUN npm ci --ignore-scripts

# Generate Prisma client for Linux
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
