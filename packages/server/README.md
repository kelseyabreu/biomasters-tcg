# BioMasters TCG Server

Backend API server for BioMasters TCG using the **FIRE stack** with JSON-driven game engine.

## 🚀 Quick Start

### Basic Development (No Redis)
```bash
npm install
npm run dev
# Server runs on http://localhost:3001
# ✅ API endpoints work
# ✅ Authentication works
# ✅ Database operations work
# ⚠️ Matchmaking/Redis features disabled
```

### Full Development (With Redis + Pub/Sub)
```bash
# 1. Start Redis tunnel (keep this running)
npm run redis:tunnel

# 2. Start server (in new terminal)
npm start
# ✅ All features work including:
#   - Real-time matchmaking
#   - Distributed game workers
#   - WebSocket real-time features
#   - Pub/Sub messaging system
```

### Development Modes Comparison

| Feature | Basic Mode | Full Mode |
|---------|------------|-----------|
| **API Endpoints** | ✅ Working | ✅ Working |
| **Authentication** | ✅ Working | ✅ Working |
| **Database** | ✅ Working | ✅ Working |
| **Redis Cache** | ⚠️ Memory fallback | ✅ GCP Memorystore |
| **Matchmaking** | ❌ Disabled | ✅ Full system |
| **WebSocket** | ✅ Basic | ✅ Real-time features |
| **Game Workers** | ❌ Disabled | ✅ Distributed workers |
| **Pub/Sub** | ❌ Disabled | ✅ Google Cloud Pub/Sub |

## 🏗️ Architecture

### FIRE Stack
- **🔥 Firebase**: Authentication with guest user support
- **⚡ Express**: TypeScript API server with comprehensive middleware
- **🔴 Redis**: Optional caching and session management
- **🐘 PostgreSQL**: Database with Kysely type-safe queries

### Game Engine
- **📚 JSON-Driven**: Reads game data from `/public/data/*.json` (single source of truth)
- **🎮 BioMasters Engine**: Complete implementation of rules from `BioMasterEngine.txt` and `RulesForBiomasters.txt`
- **🔒 Type-Safe**: Shared enums and types between frontend/backend
- **⚡ Real-time**: WebSocket support for multiplayer features
- **✅ Production-Ready**: 100% test coverage with 19/19 integration tests passing
- **🧬 Biologically Accurate**: Real ecosystem data with proper trophic relationships
- **🎯 Authoritative Server**: `shared/game-engine/BioMastersEngine.ts` for TCG online mode
- **🔄 Automatic Turn Management**: State machine handles Ready→Draw→Action phases with timeouts
- **🏠 HOME Card System**: Domain 0 for universal compatibility, chemoautotrophs connect to geological entities

## 🛠️ Complete Setup Guide

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 12+**
- **Google Cloud CLI** (for Redis tunnel)
- **Firebase project** with Admin SDK
- **Google Cloud Project** with Memorystore Redis

### 1. Basic Installation
```bash
cd packages/server
npm install

# Environment setup
cp .env.example .env
# Edit .env with your database and Firebase credentials

# Database setup
createdb biomasters_tcg
npm run db:migrate

# Test basic server (without Redis)
npm run dev
# Server available at http://localhost:3001
```

### 2. Redis + Pub/Sub Setup (Full Features)

#### Step 1: Google Cloud Authentication
```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

#### Step 2: Add Pub/Sub Permissions
```bash
# Add Pub/Sub permissions to Firebase service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"
```

#### Step 3: Create VM for SSH Tunnel
```bash
# Create a VM for the SSH tunnel
gcloud compute instances create biomasters-dev-vm \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=10GB \
  --project=YOUR_PROJECT_ID
```

#### Step 4: Start Redis Tunnel
```bash
# Start the Redis tunnel (keep this running)
npm run redis:tunnel

# This runs:
# gcloud compute ssh biomasters-dev-vm \
#   --zone=us-central1-a \
#   --project=YOUR_PROJECT_ID \
#   --ssh-flag="-L" \
#   --ssh-flag="6379:REDIS_IP:6378"
```

#### Step 5: Start Full Server
```bash
# In new terminal, start server with Redis
npm start

# Verify all services are working
curl http://localhost:3001/health
# Should show: "redis": true
```

### Game Data Loading
The server automatically loads game data from `/public/data/*.json` at startup:
- ✅ **cards.json** → GameDataManager → Game Engine
- ✅ **abilities.json** → Effect system
- ✅ **en.json** → Localization
- ✅ **Database sync** via `npm run import-data` (for API queries only)

## 📚 API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/migrate-guest` - Convert guest to registered user

### 🃏 Cards & Game Data
- `GET /api/cards/database` - Queryable card database (from PostgreSQL)
- `GET /api/cards/game-data` - Complete game data (from JSON files)
- `GET /api/cards/keywords` - All keywords with localization
- `GET /api/cards/abilities` - All abilities with effects
- `GET /api/cards/conservation-statuses` - IUCN conservation data

### 🎮 Game Engine
- `POST /api/game/biomasters/create` - Create new game instance
- `POST /api/game/biomasters/:gameId/action` - Process game action
- `GET /api/game/biomasters/:gameId/state` - Get current game state
- `WebSocket /ws` - Real-time game updates

### 👤 User Management
- `GET /api/users/me` - Get user profile
- `PUT /api/users/me/currency` - Update user currency
- `GET /api/users/leaderboard` - Get leaderboards

### 🛡️ Admin (requires Firebase custom claims)
- `GET /api/admin/users` - Manage users
- `GET /api/admin/analytics` - System analytics
- `POST /api/admin/physical-cards/generate` - Generate redemption codes

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Build for production
npm start              # Start production server

# Database
npm run db:migrate     # Run migrations
npm run import-data    # Sync JSON → PostgreSQL (for API queries)
npm run db:reset       # Reset database

# Game Engine Testing
npm test               # All tests
npm test -- ComprehensiveGameRules.integration.test.ts  # 19 integration tests (100% passing)
npm test -- --testPathPattern="game-engine"  # All game engine tests (180+ tests)

# Utilities
npx tsx src/scripts/test-json-engine.ts    # Test JSON loading
npx tsx src/scripts/comprehensive-api-test.ts  # API tests
```

## ⚙️ Environment Variables

### Development (.env)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@your-project.iam.gserviceaccount.com

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/biomasters_tcg

# Redis Configuration - GCP Memorystore via SSH Tunnel
# LOCAL DEV: Run tunnel first: npm run redis:tunnel
# PRODUCTION: Cloud Run uses direct IP (VPC connector)
REDIS_URL=rediss://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Google Cloud Pub/Sub Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Security
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-jwt-secret

# Game Configuration
PACK_OPENING_RATE_LIMIT=10
DAILY_PACK_COOLDOWN_HOURS=24
MAX_DECK_SIZE=40
MIN_DECK_SIZE=30
```

### Production (.env.production)
```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Firebase Admin SDK (same as development)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@your-project.iam.gserviceaccount.com

# PostgreSQL Database (production)
DATABASE_URL=postgresql://user:password@prod-host:5432/biomasters_tcg

# Redis Configuration - GCP Memorystore (Direct IP for Cloud Run)
REDIS_URL=rediss://10.36.239.107:6378
REDIS_HOST=10.36.239.107
REDIS_PORT=6378
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Google Cloud Pub/Sub Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Security (production)
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-production-jwt-secret
```

## 🏗️ Technical Architecture

### **JSON-Driven Game Engine**
```typescript
// GameDataManager loads from /public/data/
const cards = gameDataManager.getCards();        // cards.json
const abilities = gameDataManager.getAbilities(); // abilities.json
const localization = gameDataManager.getLocalization(); // en.json

// BioMasters Engine uses loaded data (authoritative for TCG)
const engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase);
const gameState = engine.initializeNewGame(gameId, players, settings);

// Automatic turn progression with state machine
engine.processAction({ type: GameActionType.PLAYER_READY, playerId, payload: {} });
// Transitions: SETUP → PLAYING when all players ready
// Turn phases: READY → DRAW → ACTION (3 actions per turn)
```

### **Data Flow Architecture**
```
/public/data/*.json (Single Source of Truth)
    ↓
GameDataManager (Server startup)
    ↓
BioMasters Engine (Authoritative TCG game logic)
    ↓
    ├── TCGGameService (Client wrapper for offline mode)
    ├── API Endpoints (Game state management)
    └── WebSocket (Real-time updates)

Frontend Engines:
├── UnifiedGameService (Single service for both modes)
│   ├── TCGEngine (Wraps BioMastersEngine for offline TCG)
│   └── PhyloEngine (Educational campaign mode)
```

### **Database Role**
- **PostgreSQL**: API queries only (NOT game engine source)
- **Sync Process**: `npm run import-data` syncs JSON → Database
- **Purpose**: Queryable card database, deck builder, user collections
- **Game Engine**: Uses JSON files directly via GameDataManager

### **Authentication Tiers**
- **Guest**: `requireAuth` - Can play offline, limited online features
- **Registered**: `requireRegisteredUser` - Full account, cross-device sync
- **Admin**: `requireAdmin` - Management access via Firebase custom claims

## 🛡️ Security & Performance

### Security Features
- **🔐 Firebase Auth**: ID token verification with guest support
- **🛡️ Rate Limiting**: Tiered limits by endpoint sensitivity
- **✅ Input Validation**: Request sanitization and validation
- **🔒 CORS**: Configurable cross-origin resource sharing
- **🛡️ Helmet**: Security headers for production

### Performance Optimizations
- **⚡ Redis Caching**: Session and rate limit caching (optional)
- **🔄 Connection Pooling**: Efficient database connections via Kysely
- **📊 Query Optimization**: Type-safe queries with automatic optimization
- **💾 Memory Fallbacks**: Graceful degradation when Redis unavailable

## 🚀 Production Deployment

```bash
# Build and deploy
NODE_ENV=production
npm run build
npm run db:migrate
npm start

# Health check
curl http://localhost:3001/health
```

### Docker Example
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Game Engine Testing

The server includes comprehensive tests for the BioMasters game engine:

```bash
# Comprehensive integration tests (19 tests covering all core rules)
npm test -- ComprehensiveGameRules.integration.test.ts

# All game engine tests (180+ tests across multiple suites)
npm test -- --testPathPattern="game-engine"

# Specific test categories
npm test -- BasicCardPlaying.integration.test.ts    # Core card playing mechanics
npm test -- CardValidation.modern.test.ts           # Validation rules
npm test -- RealDataGameplay.modern.test.ts         # Real JSON data tests

# API endpoint tests
npx tsx src/scripts/comprehensive-api-test.ts  # API integration tests
npx tsx src/scripts/edge-case-tests.ts         # Edge case validation
```

### Test Coverage
- ✅ **Production Loop Rules**: Producer → Herbivore → Carnivore → Apex food chains
- ✅ **Decomposition Loop Rules**: Detritus → Saprotrophs (-1S) → Detritivores (-2D) → Score Pile
- ✅ **Trophic Level Validation**: Strict +1 level progression enforcement
- ✅ **Domain Compatibility**: Terrestrial/Aquatic/Marine domain matching with attachment rules
- ✅ **Cost Payment System**: Resource exhaustion and availability checking
- ✅ **HOME System**: Photoautotroph connections, chemoautotroph restrictions (cannot connect to HOME)
- ✅ **Advanced Mechanics**: Mixotrophs, Metamorphosis, Parasites, Mutualists
- ✅ **Turn Management**: 3 actions per turn, automatic turn transitions
- ✅ **Game Phase Management**: SETUP → PLAYING phase transitions with player ready states
- ✅ **Victory Conditions**: Game end detection, VP calculation
- ✅ **Ability System**: Complete effect execution with proper EffectID handling
- ✅ **Data Integrity**: Real JSON data validation (25 cards, 15 abilities, 40 keywords)
- ✅ **Card Distribution**: Real species data from card database for starting hands/decks
- ✅ **Valid Position Calculation**: Adjacent placement rules with HOME card compatibility

### 🎯 **Comprehensive Integration Testing**
Our `ComprehensiveGameRules.integration.test.ts` suite achieves **100% test coverage** of core game mechanics:
- **19 integration tests** covering both positive and negative paths
- **Real game data** from JSON files (not mocked data)
- **Complete rule validation** following BioMasterEngine.txt and RulesForBiomasters.txt
- **Production-ready validation** ensuring game engine reliability
- **Fixed ability execution** - All effects now execute properly with correct EffectID handling
- **Enhanced rule compliance** - Chemoautotrophs, Detritivores, and attachment systems fully implemented
- **Turn state management** - Automatic Ready→Draw→Action progression with player ready validation
- **Card distribution system** - Real species data used for starting hands and deck construction
- **Grid placement validation** - HOME card adjacency rules and valid position calculation

## 🔧 Troubleshooting

### Common Issues

#### Basic Server Issues
```bash
# Port in use
npx kill-port 3001

# Clean build
rm -rf node_modules dist && npm install && npm run build

# Database issues
npm run db:reset && npm run db:migrate

# Test game data loading
npx tsx src/scripts/test-json-engine.ts
```

#### Redis Connection Issues
```bash
# Check if Redis tunnel is running
ps aux | grep "gcloud compute ssh"

# Restart Redis tunnel
npm run redis:tunnel

# Test Redis connection manually
redis-cli -h localhost -p 6379 --tls --insecure ping
# Should return: PONG

# Check server logs for Redis status
npm start | grep -i redis
# Look for: "✅ Redis connected successfully"
```

#### Pub/Sub Permission Issues
```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Re-add Pub/Sub permissions if missing
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

# Test Pub/Sub connection
curl http://localhost:3001/health
# Check for: "✅ Google Cloud Pub/Sub initialized successfully"
```

#### SSH Tunnel Issues
```bash
# Check VM status
gcloud compute instances list --project=YOUR_PROJECT_ID

# Test SSH connection
gcloud compute ssh biomasters-dev-vm \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID \
  --command="echo 'SSH works'"

# Check if Redis is reachable from VM
gcloud compute ssh biomasters-dev-vm \
  --zone=us-central1-a \
  --project=YOUR_PROJECT_ID \
  --command="nc -zv REDIS_IP 6378"
```

### Debug Mode
```bash
# Enable detailed logging
DEBUG=biomasters:* npm run dev

# Health check with detailed output
curl http://localhost:3001/health | jq

# Test specific endpoints
curl http://localhost:3001/health/ioredis
node test-redis-endpoints.js
```

### Service Status Verification
```bash
# Check all services
curl http://localhost:3001/health

# Expected output for full setup:
{
  "status": "healthy",
  "services": {
    "database": true,
    "redis": true,      # ✅ Should be true with tunnel
    "firebase": true
  }
}

# Test matchmaking (requires guest token)
curl -X POST http://localhost:3001/api/guest/create
# Use returned token for matchmaking test
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-mechanic`)
3. Follow existing patterns in `/src/game-engine/`
4. Add tests for new game mechanics
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.
