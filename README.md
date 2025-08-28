# Biomasters Trading Card Game

A digital trading card game where players battle using cards based on real species and their biological characteristics. Built with React, Ionic, Framer Motion, and Capacitor for cross-platform deployment.

## 🎮 Game Overview

Biomasters TCG combines the strategic depth of traditional trading card games with real biological data and scientific accuracy. Players collect species cards, build ecosystem-balanced decks, and battle using actual biological stats like mass, speed, sensory ranges, and environmental adaptations.

### Key Features

- **27 Real Species**: Cards based on actual animals and plants with scientifically accurate stats
- **4 Win Conditions**: Multiple paths to victory including Apex Predator, Ecosystem Balance, Conservation Victory, and Species Collection
- **2d10 Combat System**: Probability-based combat with biological modifiers
- **Environmental Effects**: Temperature, habitat, and seasonal modifiers affect gameplay
- **Offline Play**: Full PWA capabilities with service worker for offline gameplay
- **Mobile Ready**: Native iOS and Android deployment via Capacitor

## 🔐 Authentication & Data Management

### Guest Mode
- **Instant Play**: Start playing immediately without account creation
- **Local Storage**: Progress saved securely on device using cryptographic signatures
- **Full Features**: Access to all game mechanics including pack opening, collection, and battles


### Account Mode
- **Cloud Sync**: Progress synchronized across all devices
- **Backup Protection**: Collection and progress backed up to cloud
- **Cross-Platform**: Seamless experience between web and mobile
- **Social Features**: Access to leaderboards and community features

### Data Architecture
- **Offline-First**: All game logic works without internet connection
- **Hybrid Sync**: Authenticated users get automatic cloud synchronization
- **Conflict Resolution**: Smart handling of offline changes when reconnecting
- **Security**: All offline data cryptographically signed to prevent tampering

## 🌍 IUCN Red List Integration

### Educational Accuracy
- **Real Conservation Data**: Card rarity based on actual IUCN Red List percentages
- **Scientific Accuracy**: Species information sourced from official conservation databases
- **Updated Statistics**: Conservation percentages reflect current (October 2024) IUCN data
- **Excluded Categories**: "Not Evaluated" species excluded as they typically receive evaluation

### Conservation Status Distribution
- **Extinct (0.54%)**: Ultra-rare cards representing species with no known individuals
- **Extinct in Wild (0.054%)**: Legendary cards for species surviving only in captivity
- **Critically Endangered (5.95%)**: Epic cards for species at extreme risk
- **Endangered (10.92%)**: Rare cards for species at very high risk
- **Vulnerable (13.19%)**: Uncommon cards for species at high risk
- **Near Threatened (5.73%)**: Uncommon cards for species close to threatened status
- **Least Concern (50.51%)**: Common cards for widespread and abundant species
- **Data Deficient (12.97%)**: Uncommon cards for species with inadequate information

### Educational Impact
- **Conservation Awareness**: Players learn real conservation statistics through gameplay
- **Rarity Connection**: Game mechanics reinforce real-world conservation priorities
- **Species Education**: Detailed information about habitats, threats, and conservation efforts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd biomasters-tcg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

## 🎯 How to Play

### Getting Started

1. **View Collection**: Browse all 27 species cards with their biological stats
2. **Build a Deck**: Create an 8-card deck with at least 2 Producers and 2 Herbivores
3. **Start Battle**: Challenge the AI opponent with your custom deck
4. **Achieve Victory**: Win through one of four different victory conditions

### Win Conditions

- **Apex Predator**: Eliminate 4 of your opponent's cards from the game
- **Ecosystem Balance**: Have at least one Producer, Herbivore, and Carnivore on your field simultaneously
- **Conservation Victory**: End your turn with 6 or more unique species cards in play
- **Species Collection**: Play at least 12 unique species cards from your deck over the course of the game

### Combat System

Combat uses a 2d10 dice system (1-100 results) with biological modifiers:

- **Base Success Rates**: 60% for trophic advantage, 50% otherwise
- **Speed Advantage**: +20% if attacker's speed > defender's speed
- **Senses Advantage**: +15% if attacker's senses > defender's senses
- **Habitat Match**: +15% if attacker matches current environment
- **Special Abilities**: Species-specific bonuses (pack hunting, flight, etc.)

## 🏗️ Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── battle/      # Battle screen components
│   └── collection/  # Collection and deck builder
├── game-logic/      # Core game rules and systems
│   ├── combatSystem.ts
│   ├── gameEngine.ts
│   ├── winConditions.ts
│   └── aiOpponent.ts
├── hooks/           # Custom React hooks
├── pages/           # Top-level screens
├── state/           # Zustand state management
├── types/           # TypeScript interfaces
├── utils/           # Helper functions
└── styles/          # Global CSS and themes

public/
├── species/         # Species JSON data files (loaded via fetch)
├── images/          # Static images and artwork
└── manifest.json    # PWA manifest
```

## 🧬 Species Data

Each species card is generated from real biological data including:

- **Physical Stats**: Mass, speed, sensory ranges
- **Environmental Preferences**: Temperature tolerance, habitat requirements
- **Behavioral Traits**: Feeding methods, social behaviors
- **Taxonomic Information**: Scientific classification

### Example Species Mapping

```typescript
// Wolf stats mapped to game mechanics
{
  power: 4,        // mass_kg / 10
  health: 35,      // mass_kg
  speed: 6,        // run_speed / 1000
  senses: 200,     // max(smell, hearing, vision)
  habitat: "Temperate", // based on temperature range
  abilities: ["Pack Hunter"] // derived from behavior
}
```

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Ionic 7 for native components
- **Animations**: Framer Motion for card interactions
- **State Management**: Zustand with persistence
- **Build Tool**: Vite for fast development
- **Mobile**: Capacitor 5 for iOS/Android deployment
- **PWA**: Service Worker for offline capabilities

## 📱 Mobile Deployment

### iOS Deployment

1. **Add iOS platform**
   ```bash
   npx cap add ios
   ```

2. **Build and sync**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

### Android Deployment

1. **Add Android platform**
   ```bash
   npx cap add android
   ```

2. **Build and sync**
   ```bash
   npm run build
   npx cap sync android
   ```

3. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

## 🧪 Testing

### Unit Tests

```bash
npm run test.unit
```

### E2E Tests

```bash
npm run test.e2e
```

### Game Logic Testing

The core game systems include comprehensive tests for:
- Combat resolution and probability calculations
- Win condition detection and progress tracking
- Deck validation and card interactions
- AI decision-making algorithms

## 🎨 Customization

### Adding New Species

1. Create species JSON file in `public/species/`
2. Add to `public/species/manifest.json`
3. Add species name to `speciesList` array in `speciesDataProcessor.ts`
4. Species will be loaded automatically via fetch

### Modifying Game Rules

Core game logic is modular and can be easily modified:
- Combat modifiers in `combatSystem.ts`
- Win conditions in `winConditions.ts`
- AI behavior in `aiOpponent.ts`

## 🌐 PWA Features

- **Offline Play**: Full game functionality without internet
- **App Installation**: Install as native app on mobile/desktop
- **Background Sync**: Sync game data when connection restored
- **Push Notifications**: Updates and reminders (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Species data sourced from scientific databases and research
- Ionic team for the excellent mobile framework
- Framer Motion for smooth animations
- All contributors to the open-source ecosystem

## 🏗️ System Architecture

### **Frontend + Backend Integration**
- **Frontend**: React + Ionic PWA with offline capabilities
- **Backend**: Express.js API server with Firebase authentication
- **Database**: PostgreSQL with type-safe Kysely query builder
- **Caching**: Redis for session management and performance
- **Authentication**: Firebase Auth with guest user support

### **Key Technical Concepts**

#### **Authentication Flow**
- **Guest Users**: Can play offline, limited online features
- **Registered Users**: Full account features, cross-device sync
- **Admin Users**: Management panel access via Firebase custom claims

#### **Data Management**
- **Offline-First**: Game works without internet connection
- **Sync Strategy**: Automatic sync when connection available
- **Type Safety**: Full TypeScript coverage with Kysely database types
- **Caching**: Smart caching for performance optimization

#### **Game Architecture**
- **Species Data**: JSON-based lazy loading for card information
- **Game Logic**: Modular combat system with biological accuracy
- **State Management**: Zustand for predictable state updates
- **Real-time**: WebSocket support for multiplayer features

## 🐛 Known Issues

- Some species may have placeholder artwork
- AI difficulty scaling needs fine-tuning
- Performance optimization needed for large collections

## 🔮 Future Features

- Multiplayer battles
- Tournament mode
- Card trading system
- Achievement system
- Expanded species database
- Custom card creation tools

---

**Built with ❤️ for education and entertainment**
