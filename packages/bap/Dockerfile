FROM node:20-alpine

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
RUN npm run build --workspace=@p2p/shared
RUN npm run build --workspace=@p2p/bap

# Expose port
EXPOSE 4000

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Start the app
CMD ["node", "packages/bap/dist/index.js"]
