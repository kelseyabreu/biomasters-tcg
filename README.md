# BioMasters Trading Card Game

A scientifically accurate digital trading card game where players build interconnected ecosystems using real species data. Experience the complexity of nature through strategic gameplay that mirrors actual ecological relationships.

## 🧬 Game Overview

BioMasters TCG is a **living card game of strategy and synergy** for 2-4 players. Build intricate food webs on a shared grid, mastering the infinite cycle of life through two fundamental forces:

- **🌱 The Production Loop**: Energy flows from producers (+1) through herbivores (+2), carnivores (+3), to apex predators (+4)
- **♻️ The Decomposition Loop**: Death becomes renewal through saprotrophs (-1S) and detritivores (-2D)

### Core Features

- **🎯 Victory by Victory Points**: Game ends when a player can't draw; most VP in Score Pile wins
- **🏠 HOME Card System**: Central placement point for photoautotrophs (+1A) but NOT chemoautotrophs (+1C)
- **🎴 Detritus Mechanics**: Removed creatures become face-down detritus tiles for saprotroph placement
- **⚡ Preferred Diet Bonuses**: Cards enter play Ready when connecting to specific food sources
- **🔄 Metamorphosis System**: Juvenile cards can upgrade to adult forms for tempo advantage
- **🌍 Real IUCN Data**: Card rarity based on actual conservation status percentages
- **📱 Cross-Platform**: Web and mobile with full offline support
- **🧬 Production-Ready Engine**: 100% test coverage with real biological data validation
- **🎮 Dual Game Modes**: TCG Battle for competitive play, Phylo Campaign for education
- **🔄 Automatic Turn Management**: State machine handles Ready→Draw→Action phases with timeouts
- **🌐 Hybrid Online/Offline**: Seamless switching with local state and server synchronization

## 🎮 How to Play

### Game Modes
- **🎯 TCG Battle**: Full trading card game with deck building and strategic gameplay
- **🌱 Phylo Campaign**: Educational single-player mode with pre-built decks
- **🔄 Hybrid System**: Seamless switching between modes with shared card collection

### Turn Structure
Each turn follows the **Ready → Draw → Action** sequence:

1. **Ready Phase**: Exhaust all your cards (make them Ready)
2. **Draw Phase**: Draw one card from your deck
3. **Action Phase**: Take up to **3 actions** from:
   - Play a creature card (pay cost by exhausting cards)
   - Activate an ability
   - Pass turn

### Card Placement Rules
- **Photoautotrophs (+1A)**: Must connect to your HOME card or other producers
- **Chemoautotrophs (+1C)**: Cannot connect to HOME; must connect to Saprotrophs (-1S) or Detritivores (-2D)
- **Consumers (+2, +3, +4)**: Must connect to lower trophic level (+1 progression rule)
- **Saprotrophs (-1S)**: Must connect to detritus tiles (from removed creatures)
- **Detritivores (-2D)**: Must connect to Saprotrophs (-1S) to complete decomposition loop
- **Attachments**: Parasites (P) and Mutualists (M) attach to host creatures with domain compatibility

### Victory Conditions
- **Game End**: When a player cannot draw from their deck
- **Winner**: Player with most Victory Points in their Score Pile
- **Score Sources**: Removed creatures (1 VP), card abilities, special effects

## 🌍 IUCN Conservation Integration

### Educational Pack System
Card rarity reflects **real IUCN Red List percentages** (October 2024 data):

| Status | Percentage | Pack Rarity | Educational Impact |
|--------|------------|-------------|-------------------|
| **Extinct (EX)** | 0.54% | Ultra-rare | Learn about species loss |
| **Extinct in Wild (EW)** | 0.054% | Legendary | Captive breeding programs |
| **Critically Endangered (CR)** | 5.95% | Epic | Immediate conservation action |
| **Endangered (EN)** | 10.92% | Rare | High extinction risk |
| **Vulnerable (VU)** | 13.19% | Uncommon | Declining populations |
| **Near Threatened (NT)** | 5.73% | Uncommon | Conservation dependent |
| **Least Concern (LC)** | 50.51% | Common | Stable populations |
| **Data Deficient (DD)** | 12.97% | Uncommon | Research needed |

### Scientific Accuracy
- **Authentic Distribution**: Pack opening mirrors real-world species abundance
- **Educational Tooltips**: Learn conservation status during gameplay
- **Research Integration**: Species data sourced from scientific databases

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ (for server)
- Redis 6+ (optional, for caching)

### Frontend Only
```bash
git clone <repository-url>
cd biomasters-tcg
npm install
npm run dev
# Open http://localhost:5173
```

### Full Stack Setup
```bash
# 1. Frontend
npm install
npm run dev

# 2. Server (in separate terminal)
cd server
npm install
npm run db:migrate  # Set up PostgreSQL first
npm run dev
# Server runs on http://localhost:3001
```

### Game Data Architecture
- **Single Source**: All game data in `/public/data/*.json`
- **Frontend**: Reads JSON directly for offline-first gameplay
- **Server**: Uses same JSON files via GameDataManager
- **Database**: Synced from JSON for API queries only

## 🎯 Advanced Mechanics

### Special Card Types

#### **Mixotrophs**
- **Dual Nutrition**: Can function as both producers and consumers
- **Flexible Placement**: Connect to HOME (photosynthesis) OR prey (consumption)
- **Examples**: Venus Flytrap, Sundew, Bladderwort

#### **Metamorphosis**
- **Life Stages**: Juvenile cards can transform into adult forms
- **Tempo Advantage**: Discard adult from hand to upgrade juvenile on grid
- **Ready State**: Transformed creatures enter play Ready (not exhausted)

#### **Attachments**
- **Parasites (P)**: Attach to host, provide negative effects
- **Mutualists (M)**: Attach to host, provide positive effects
- **Host Dependency**: Attachments are removed if host is removed

### Domain System
Cards have domain keywords affecting placement:
- **TERRESTRIAL**: Land-based creatures
- **AQUATIC**: Water-based creatures (FRESHWATER/MARINE)
- **AMPHIBIOUS**: Can connect to both terrestrial and aquatic
- **EURYHALINE**: Tolerates both fresh and salt water

### Energy & Exhaustion
- **Ready State**: Card can be used for abilities or payment
- **Exhausted State**: Card used this turn, cannot act
- **Cost Payment**: Exhaust cards to pay for new creature costs

## 🏗️ Architecture

### Project Structure
```
biomasters-tcg/
├── public/data/           # 🎯 SINGLE SOURCE OF TRUTH
│   ├── cards.json        # Complete card data
│   ├── abilities.json    # Ability definitions
│   └── en.json          # Localization data
├── src/                  # Frontend (React + Ionic)
│   ├── components/      # UI components
│   │   ├── battle/     # TCG Battle screens
│   │   ├── game/       # Phylo Campaign screens
│   │   └── cards/      # Card rendering components
│   ├── pages/          # Screen components
│   ├── services/       # Game engines and API clients
│   │   ├── ClientGameEngine.ts    # TCG offline engine
│   │   ├── TCGGameService.ts      # TCG service layer
│   │   └── PhyloGameService.ts    # Phylo service layer
│   └── state/          # Zustand hybrid game store
├── server/              # Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── game-engine/ # Authoritative BioMasters engine
│   │   ├── services/   # GameDataManager (reads /public/data/)
│   │   └── database/   # PostgreSQL queries (API only)
│   └── public/         # (removed - no duplicates)
└── shared/             # TypeScript enums & types
    └── game-engine/    # Shared BioMasters engine
```

### Data Flow
```
/public/data/*.json (Single Source)
    ↓
    ├── Frontend: Direct JSON loading (offline-first)
    │   ├── ClientGameEngine (TCG offline mode)
    │   └── PhyloGameService (Campaign mode)
    ├── Server: GameDataManager reads same files
    │   └── BioMastersEngine (Authoritative online mode)
    └── Database: Synced via import script (API queries only)
```

### Game Engine Architecture
- **🎯 TCG Mode**: Uses `server/src/game-engine/BioMastersEngine.ts` as authoritative source
- **🌱 Phylo Mode**: Uses `src/game-logic/gameStateManager.ts` for educational gameplay
- **🔄 Client Engine**: `src/services/ClientGameEngine.ts` wraps BioMastersEngine for offline TCG
- **🌐 Hybrid Store**: `src/state/hybridGameStore.ts` manages both modes with seamless switching

## 🧬 Game Engine

### JSON-Driven Design
The game engine is **completely data-driven** using three core files:

#### **cards.json** - Card Definitions
```json
{
  "CardID": 1,
  "TrophicLevel": 1,
  "TrophicCategory": 1,
  "Cost": null,
  "Keywords": [1, 6, 70],
  "Abilities": [9],
  "VictoryPoints": 1,
  "CommonName": "Oak Tree",
  "ScientificName": "Quercus robur"
}
```

#### **abilities.json** - Effect System
```json
{
  "AbilityID": 1,
  "TriggerID": 1,
  "Effects": [{
    "EffectID": 1,
    "SelectorID": 1,
    "ActionID": 1,
    "FilterKeywords": [2]
  }]
}
```

#### **en.json** - Localization
```json
{
  "CardNames": {"1": "Oak Tree"},
  "CardAbilitiesText": {"1": "Photosynthesis ability"},
  "Keywords": {"1": "TERRESTRIAL"}
}
```

## 🛠️ Technology Stack

### Frontend
- **React 18** + TypeScript for type-safe UI
- **Ionic 7** for cross-platform components
- **Vite** for fast development builds
- **Capacitor 5** for native iOS/Android deployment
- **PWA** with service worker for offline play
- **Zustand** for state management with persistence
- **Hybrid Architecture** supporting both TCG and Phylo modes

### Backend (FIRE Stack)
- **Firebase** Authentication with guest support
- **Express.js** API server with TypeScript
- **Redis** for caching (optional)
- **PostgreSQL** with Kysely type-safe queries

### Game Engine
- **JSON-driven** architecture for easy modding
- **Offline-first** design with online sync
- **Type-safe enums** shared between frontend/backend
- **Real-time** WebSocket support for multiplayer
- **Dual Engine System**: BioMastersEngine (TCG) + PhyloGameService (Campaign)
- **Automatic Turn Management**: State machine with Ready→Draw→Action phases
- **Cross-Platform Deployment**: Web, iOS, Android with offline capabilities

## 📱 Mobile Deployment

```bash
# iOS
npx cap add ios
npm run build && npx cap sync ios
npx cap open ios

# Android
npx cap add android
npm run build && npx cap sync android
npx cap open android
```

## 🧪 Testing

```bash
# Frontend tests
npm test

# Server tests
cd server && npm test

# Comprehensive game engine tests (19 integration tests)
cd server && npm test -- ComprehensiveGameRules.integration.test.ts

# All game engine tests (180+ tests across multiple suites)
cd server && npm test -- --testPathPattern="game-engine"
```

### 🎯 **Production-Ready Game Engine**
Our comprehensive integration test suite achieves **100% success rate** across 19 core game mechanics tests, validating:
- ✅ **Complete food chain building** with real biological data (10 cards, 15 abilities, 40 keywords)
- ✅ **Strict trophic level validation** and domain compatibility rules
- ✅ **Advanced mechanics**: Chemoautotrophs, Detritivores, Mixotrophs, Metamorphosis, Attachments
- ✅ **Turn management** and action limit enforcement (3 actions per turn)
- ✅ **Ability system** with proper effect execution and trigger processing
- ✅ **Game phase management** and victory conditions

## 🎨 Game Modding

### Adding New Cards
1. Edit `/public/data/cards.json` with new card data
2. Add localization to `/public/data/en.json`
3. Run `cd server && npm run import-data` to sync database
4. Cards automatically available in both frontend and server

### Custom Abilities
1. Define new effects in `/public/data/abilities.json`
2. Add ability text to localization file
3. Game engine automatically processes new abilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing patterns
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **IUCN Red List** for conservation data
- **Scientific databases** for species information
- **Ionic & React teams** for excellent frameworks
- **Open source community** for foundational tools

---

**🧬 Built with scientific accuracy and educational purpose in mind**
