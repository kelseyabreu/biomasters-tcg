# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Install tsx globally for runtime TypeScript execution
RUN npm install -g tsx

# Expose port
EXPOSE 8080

# Run the test script
CMD ["tsx", "src/test-memorystore-connection.ts"]
