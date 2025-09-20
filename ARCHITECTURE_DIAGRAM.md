# 🧬 BioMasters TCG - Complete Architecture & Data Flow

## 📦 Monorepo Structure

```
biomasters-tcg/
├── 📦 packages/
│   ├── 🔧 shared/                    # @kelseyabreu/shared (npm workspace)
│   │   ├── src/
│   │   │   ├── 📋 types.ts           # TypeScript interfaces & types
│   │   │   ├── 🎯 enums.ts           # Game enums (CardId, TrophicLevel, etc.)
│   │   │   ├── 🎮 game-engine/       # Unified game engine system
│   │   │   │   ├── IGameEngine.ts    # Interface & GameMode enum
│   │   │   │   ├── BaseGameEngine.ts # Abstract base class
│   │   │   │   ├── TCGEngine.ts      # TCG mode (wraps BioMastersEngine)
│   │   │   │   ├── PhyloEngine.ts    # Phylo mode (campaign logic)
│   │   │   │   ├── BioMastersEngine.ts # Core game rules engine
│   │   │   │   └── GameEngineFactory.ts # Engine creation & caching
│   │   │   ├── 📊 data/              # Cross-platform data loading
│   │   │   │   ├── DataLoader.ts     # Base data loader interface
│   │   │   │   ├── DataCache.ts      # Browser-safe caching
│   │   │   │   └── UnifiedDataLoader.ts # Environment detection
│   │   │   ├── 🛠️ utils/             # Shared utilities
│   │   │   └── 🌐 localization-manager.ts
│   │   └── dist/                     # Compiled output
│   │
│   ├── 🚀 server/                    # Backend API Server (Node.js)
│   │   ├── src/
│   │   │   ├── 🌐 routes/            # API endpoints
│   │   │   │   ├── auth.ts           # Authentication routes
│   │   │   │   ├── games.ts          # Game management
│   │   │   │   ├── cards.ts          # Card data API
│   │   │   │   └── health.ts         # Health checks
│   │   │   ├── 🎮 services/          # Business logic
│   │   │   │   ├── GameWorkerManager.ts # Distributed game workers
│   │   │   │   ├── MatchmakingWorker.ts # Real-time matchmaking
│   │   │   │   └── MatchNotificationService.ts
│   │   │   ├── ⚡ websocket/          # Real-time communication
│   │   │   │   └── gameSocket.ts     # WebSocket game handler
│   │   │   ├── 🔧 config/            # Configuration
│   │   │   │   ├── database.ts       # PostgreSQL (Kysely)
│   │   │   │   ├── redis.ts          # Redis connection
│   │   │   │   ├── firebase.ts       # Firebase Admin SDK
│   │   │   │   └── pubsub.ts         # Google Cloud Pub/Sub
│   │   │   └── 🔐 middleware/        # Express middleware
│   │   ├── .env                      # Environment variables
│   │   ├── gcp-keys/                 # GCP service account keys
│   │   └── setup-redis-tunnel.bat    # SSH tunnel script
│   │
│   └── 📱 frontend/                  # React + Ionic Frontend
│       └── src/
│           ├── ⚛️ App.tsx            # Main React app
│           ├── 🗄️ state/             # State management
│           │   └── hybridGameStore.ts # Zustand + React Query
│           ├── 🎮 services/          # Frontend services
│           │   ├── UnifiedGameService.ts # Game mode abstraction
│           │   ├── GameStateManager.ts   # Local game state
│           │   ├── StaticDataManager.ts  # Data loading
│           │   ├── apiClient.ts      # API communication
│           │   ├── gameSocket.ts     # WebSocket client
│           │   └── offlineSecurityService.ts
│           ├── 🧩 components/        # React components
│           │   ├── game/             # Game UI components
│           │   ├── collection/       # Card collection
│           │   ├── battle/           # Battle interface
│           │   └── auth/             # Authentication
│           ├── 📄 pages/             # Route pages
│           ├── 🎨 theme/             # Styling system
│           └── 📋 types/             # Frontend-specific types
│
├── 📊 public/data/                   # Single Source of Truth
│   ├── cards.json                   # All card data
│   ├── abilities.json               # Ability definitions
│   ├── keywords.json                # Game keywords
│   └── localization/
│       └── en.json                  # English text
│
├── 📋 package.json                  # Root workspace config
├── ⚙️ vite.config.ts                # Frontend build config
└── 📖 README.md                     # Documentation
```

## 🌊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        📊 SINGLE SOURCE OF TRUTH                            │
│                         /public/data/*.json                                │
│                    ┌─────────────┬─────────────┐                           │
│                    │ cards.json  │abilities.json│ keywords.json             │
│                    └─────────────┴─────────────┘                           │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    📊 UNIFIED DATA LOADER                                   │
│                  (Environment Detection)                                   │
│  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐ │
│  │   🌐 Client     │   📱 Mobile     │   🚀 Server     │   🧪 Test       │ │
│  │   (Fetch API)   │  (Capacitor)    │ (Filesystem)    │ (No Cache)      │ │
│  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     🎮 GAME ENGINE SYSTEM                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                🔄 Unified Game Service                              │   │
│  │                 (Mode Abstraction)                                  │   │
│  └─────────────────────┬───────────────────────────────────────────────┘   │
│                        │                                                   │
│           ┌────────────┴────────────┐                                      │
│           ▼                         ▼                                      │
│  ┌─────────────────┐       ┌─────────────────┐                            │
│  │  🃏 TCG Engine  │       │ 🌱 Phylo Engine │                            │
│  │  (Multiplayer)  │       │   (Campaign)    │                            │
│  └─────────┬───────┘       └─────────┬───────┘                            │
│            │                         │                                    │
│            ▼                         ▼                                    │
│  ┌─────────────────┐       ┌─────────────────┐                            │
│  │🧬 BioMasters    │       │🎯 GameState     │                            │
│  │   Core Engine   │       │   Manager       │                            │
│  │ (Authoritative) │       │  (Local Logic)  │                            │
│  └─────────────────┘       └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘

## ☁️ External Services & Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🌐 GOOGLE CLOUD PLATFORM                             │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ 🔴 Redis        │    │ 📡 Cloud Pub/Sub│    │ 🔐 Service      │         │
│  │ Memorystore     │    │ (Messaging)     │    │ Account Keys    │         │
│  │ (Session Cache) │    │                 │    │                 │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                                │
│  │ 🖥️ Compute VM   │    │ 🔧 SSH Tunnel   │                                │
│  │ (biomasters-    │    │ (Development    │                                │
│  │  dev-vm)        │    │  Access)        │                                │
│  └─────────────────┘    └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           🔥 FIREBASE SERVICES                              │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ 🔐 Authentication│    │ 👤 User         │    │ 🎫 JWT Tokens   │         │
│  │ (Google, Email, │    │ Management      │    │ (Guest &        │         │
│  │  Anonymous)     │    │                 │    │  Registered)    │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           🚂 RAILWAY DATABASE                               │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ 🐘 PostgreSQL   │    │ 📊 Game Data    │    │ 👥 User Data    │         │
│  │ (Production DB) │    │ (Cards, Games,  │    │ (Profiles,      │         │
│  │                 │    │  Sessions)      │    │  Collections)   │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Development vs Production Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            🧪 DEVELOPMENT MODE                              │
│                                                                             │
│  Frontend (localhost:5173)  ──HTTP──►  Server (localhost:3001)             │
│      │                                      │                              │
│      │                                      ▼                              │
│      │                              ┌─────────────────┐                    │
│      │                              │ 🔴 Redis via    │                    │
│      │                              │ SSH Tunnel      │                    │
│      │                              │ (gcloud ssh)    │                    │
│      │                              └─────────────────┘                    │
│      │                                      │                              │
│      ▼                                      ▼                              │
│  ┌─────────────────┐              ┌─────────────────┐                      │
│  │ 📄 Local JSON   │              │ 🚂 Railway      │                      │
│  │ (/public/data)  │              │ PostgreSQL      │                      │
│  └─────────────────┘              └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            🚀 PRODUCTION MODE                               │
│                                                                             │
│  CDN/Hosting ──HTTPS──► Load Balancer ──► Server Instances                 │
│      │                        │                    │                       │
│      │                        ▼                    ▼                       │
│      │                ┌─────────────────┐  ┌─────────────────┐             │
│      │                │ 🔴 Redis        │  │ 📡 Cloud Pub/Sub│             │
│      │                │ Memorystore     │  │ (Scaling)       │             │
│      │                │ (Direct)        │  └─────────────────┘             │
│      │                └─────────────────┘                                  │
│      ▼                                                                     │
│  ┌─────────────────┐                                                       │
│  │ 🚂 Railway      │                                                       │
│  │ PostgreSQL      │                                                       │
│  │ (Production)    │                                                       │
│  └─────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎮 Game Engine State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🎯 GAME LIFECYCLE                                  │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   SETUP     │───►│   PLAYING   │───►│ FINAL_TURN  │───►│    ENDED    │  │
│  │ (Deck       │    │ (Active     │    │ (Last       │    │ (Game       │  │
│  │  Selection) │    │  Gameplay)  │    │  Round)     │    │  Complete)  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                             │                                              │
│                             ▼                                              │
│                    ┌─────────────────┐                                     │
│                    │   TURN PHASES   │                                     │
│                    │                 │                                     │
│                    │ READY ──► DRAW  │                                     │
│                    │   ▲       │     │                                     │
│                    │   │       ▼     │                                     │
│                    │  END ◄── ACTION │                                     │
│                    │ (3 actions max) │                                     │
│                    └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Synchronization Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🔄 OFFLINE-FIRST DESIGN                              │
│                                                                             │
│  Frontend Local Storage    ◄──────────────► Server Database                │
│  ┌─────────────────┐                        ┌─────────────────┐            │
│  │ 🎮 Game State   │                        │ 🎮 Authoritative│            │
│  │ 👤 User Profile │   ┌─────────────────┐  │    Game State   │            │
│  │ 🃏 Card Collection│◄─►│ 🔄 Sync Service │◄─►│ 👤 User Data    │            │
│  │ ⚙️ Settings     │   │ (Conflict       │  │ 🃏 Collections  │            │
│  │ 📊 Statistics   │   │  Resolution)    │  │ 📊 Analytics    │            │
│  └─────────────────┘   └─────────────────┘  └─────────────────┘            │
│                                                                             │
│  Offline Mode:          Online Mode:         Hybrid Mode:                  │
│  • Local JSON data     • Real-time sync     • Best of both                 │
│  • Local game engine   • Server validation  • Seamless switching           │
│  • No network needed   • Multiplayer        • Progressive enhancement      │
└─────────────────────────────────────────────────────────────────────────────┘
```
```

## 🔄 Frontend-Backend Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           📱 FRONTEND (React + Ionic)                       │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  ⚛️ React App   │    │ 🗄️ Hybrid Store │    │ 🎮 Game Services │         │
│  │   (UI Layer)    │◄──►│  (Zustand +     │◄──►│  (Business      │         │
│  │                 │    │ React Query)    │    │   Logic)        │         │
│  └─────────────────┘    └─────────────────┘    └─────────┬───────┘         │
│                                                           │                 │
│  ┌─────────────────┐    ┌─────────────────┐             │                 │
│  │ 📴 Offline Mode │    │ 🔐 Auth Service │             │                 │
│  │ (Local Storage) │    │ (Firebase)      │             │                 │
│  └─────────────────┘    └─────────────────┘             │                 │
└─────────────────────────────────────────────────────────┼─────────────────┘
                                                          │
                          ┌───────────────────────────────┼─────────────────┐
                          │                               ▼                 │
                          │  🌐 HTTP API        ⚡ WebSocket               │
                          │  (REST/JSON)        (Real-time)               │
                          └───────────────────────────────┼─────────────────┘
                                                          │
┌─────────────────────────────────────────────────────────┼─────────────────┐
│                          🚀 BACKEND (Node.js + Express) ▼                 │
│                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │ 🌐 Express API  │    │ ⚡ WebSocket     │    │ 🔐 Auth         │       │
│  │ (HTTP Routes)   │    │   Server        │    │ Middleware      │       │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────────────┘       │
│            │                      │                                      │
│            ▼                      ▼                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │ 👥 Game Workers │    │ 🎯 Matchmaking  │    │ 📡 Pub/Sub      │       │
│  │ (Distributed)   │    │   Service       │    │ Messaging       │       │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────────────┘       │
│            │                      │                                      │
│            ▼                      ▼                                      │
│  ┌─────────────────┐    ┌─────────────────┐                              │
│  │🧬 BioMasters    │    │ 🔴 Redis Cache  │                              │
│  │  Core Engine    │    │ (Session State) │                              │
│  │ (Authoritative) │    └─────────────────┘                              │
│  └─────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```
