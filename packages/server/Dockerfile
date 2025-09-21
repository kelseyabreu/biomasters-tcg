# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy shared and server packages
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build shared package first
RUN cd packages/shared && npm run build

# Build server package
RUN cd packages/server && npm run build

# Install tsx globally for runtime TypeScript execution
RUN npm install -g tsx

# Remove dev dependencies but keep tsx
RUN npm ci --only=production && npm cache clean --force

# Copy public data directory to the app root so it's accessible as ./public/data
COPY public/ ./public/

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Set working directory to server package for execution
WORKDIR /app/packages/server

# Start the application with tsx
CMD ["tsx", "src/index.ts"]
