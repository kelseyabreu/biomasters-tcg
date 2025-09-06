# BioMasters TCG Server

Backend API server for BioMasters TCG using the **FIRE stack** with JSON-driven game engine.

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
- **🎯 Authoritative Server**: `server/src/game-engine/BioMastersEngine.ts` for TCG online mode
- **🔄 Automatic Turn Management**: State machine handles Ready→Draw→Action phases with timeouts
- **🏠 HOME Card System**: Domain 0 for universal compatibility, chemoautotrophs connect to geological entities

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 12+**
- **Redis 6+** (optional - server falls back to memory caching)
- **Firebase project** with Admin SDK

### Installation
```bash
cd server
npm install

# Environment setup
cp .env.example .env
# Edit .env with your database and Firebase credentials

# Database setup
createdb biomasters_tcg
npm run db:migrate

# Start server (Redis optional)
npm run dev
# Server available at http://localhost:3001
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

```bash
# Server
PORT=3001
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/biomasters_tcg

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=http://localhost:5173
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
├── ClientGameEngine (Wraps BioMastersEngine for offline TCG)
└── PhyloGameService (Educational campaign mode)
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

### Debug Mode
```bash
# Enable detailed logging
DEBUG=biomasters:* npm run dev

# Health check
curl http://localhost:3001/health
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-mechanic`)
3. Follow existing patterns in `/src/game-engine/`
4. Add tests for new game mechanics
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.
