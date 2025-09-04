# 🗄️ Database Setup Guide for API Testing

## Quick Setup Options

### Option 1: Docker (Recommended for Testing)

If you have Docker installed:

```bash
# Start PostgreSQL and Redis with Docker
docker run --name biomasters-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=biomasters_tcg -p 5432:5432 -d postgres:13

docker run --name biomasters-redis -p 6379:6379 -d redis:6-alpine

# Wait a few seconds for containers to start
sleep 5
```

### Option 2: Local Installation

#### Windows (using Chocolatey)
```powershell
# Install PostgreSQL and Redis
choco install postgresql redis-64

# Start services
net start postgresql-x64-13
net start redis
```

#### Windows (using winget)
```powershell
# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install Redis (or use Docker for Redis)
docker run --name biomasters-redis -p 6379:6379 -d redis:6-alpine
```

#### macOS (using Homebrew)
```bash
# Install PostgreSQL and Redis
brew install postgresql redis

# Start services
brew services start postgresql
brew services start redis
```

#### Ubuntu/Debian
```bash
# Install PostgreSQL and Redis
sudo apt update
sudo apt install postgresql postgresql-contrib redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server
```

## Environment Setup

1. **Create .env file in server directory:**

```bash
# Copy example environment file
cp .env.example .env
```

2. **Edit .env with these minimal settings:**

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/biomasters_tcg
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biomasters_tcg
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Security (use any random string for testing)
JWT_SECRET=your-test-jwt-secret-here

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Firebase (optional for basic testing)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

## Database Initialization

```bash
# Navigate to server directory
cd server

# Install dependencies (if not already done)
npm install

# Run database migrations
npm run db:migrate

# Optional: Seed with test data
npm run db:seed
```

## Start the Server

```bash
# Start development server
npm run dev
```

The server should start on http://localhost:3001

## Verify Setup

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

## Run API Tests

Once the server is running:

```bash
# In a new terminal, run the comprehensive API tests
npx tsx src/scripts/comprehensive-api-test.ts
```

## Troubleshooting

### PostgreSQL Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   # Windows
   net start postgresql-x64-13
   
   # macOS/Linux
   brew services start postgresql
   # or
   sudo systemctl start postgresql
   ```

2. **Create database manually if needed:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE biomasters_tcg;
   \q
   ```

3. **Check connection:**
   ```bash
   psql -U postgres -d biomasters_tcg -h localhost -p 5432
   ```

### Redis Connection Issues

1. **Check if Redis is running:**
   ```bash
   redis-cli ping
   ```
   Should return: `PONG`

2. **Start Redis if not running:**
   ```bash
   # Docker
   docker start biomasters-redis
   
   # Local installation
   redis-server
   ```

### Server Won't Start

1. **Check port availability:**
   ```bash
   # Kill any process using port 3001
   npx kill-port 3001
   ```

2. **Check environment variables:**
   ```bash
   # Verify .env file exists and has correct values
   cat .env
   ```

3. **Check dependencies:**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules
   npm install
   ```

## Testing Without Database

If you can't set up the database, you can still test some endpoints:

```bash
# Start server in simple mode (will use fallbacks)
npm run dev

# Test basic endpoints that don't require database
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/status
```

The server is designed to gracefully handle missing database connections for basic functionality.
