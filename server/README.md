# Biomasters TCG Server

Backend API server for Biomasters TCG using the FIRE stack (Firebase, Express, Redis, PostgreSQL).

## 🏗️ Architecture

- **Firebase**: Authentication and user management
- **Express**: REST API server with TypeScript
- **Redis**: Caching and session management
- **PostgreSQL**: Primary database for game data

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Firebase project with Admin SDK

### Installation

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Set up Firebase Admin SDK**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Add the credentials to your `.env` file

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb biomasters_tcg
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/migrate-guest` - Migrate guest data
- `GET /api/auth/status` - Check auth status

### User Management

- `GET /api/users/me` - Get detailed user profile
- `GET /api/users/:userId/profile` - Get public user profile
- `PUT /api/users/me/currency` - Update user currency
- `GET /api/users/search` - Search users
- `GET /api/users/leaderboard` - Get leaderboards

### Card Management

- `GET /api/cards/collection` - Get user's card collection
- `POST /api/cards/open-pack` - Open booster pack
- `POST /api/cards/redeem-physical` - Redeem physical card
- `GET /api/cards/daily-pack` - Get daily free pack

### Game Features

- `GET /api/game/decks` - Get user's decks
- `POST /api/game/decks` - Create new deck
- `PUT /api/game/decks/:deckId` - Update deck
- `DELETE /api/game/decks/:deckId` - Delete deck
- `GET /api/game/achievements` - Get achievements
- `POST /api/game/achievements/:id/claim` - Claim achievement

### Admin Endpoints

- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:userId/ban` - Ban/unban user
- `PUT /api/admin/users/:userId/account-type` - Change account type
- `POST /api/admin/users/:userId/currency` - Adjust user currency
- `GET /api/admin/analytics` - Get analytics data
- `POST /api/admin/physical-cards/generate` - Generate redemption codes

## 🔧 Development Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database (drop and recreate)

# Testing
npm test            # Run tests
```

## 🔒 Environment Variables

Required environment variables (see `.env.example`):

### Server Configuration
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

### Firebase Admin SDK
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `FIREBASE_CLIENT_EMAIL` - Firebase client email
- (See `.env.example` for complete list)

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### Redis
- `REDIS_URL` - Redis connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### Security
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed CORS origins

## 🏗️ System Architecture Deep Dive

### **Authentication & Authorization**
- **Three-Tier Access**: Guest users, registered users, and admin users
- **Firebase Integration**: ID token verification with custom claims for admin access
- **Cache Strategy**: User data cached by `firebase_uid`, safe guest user handling
- **Middleware Stack**: `requireAuth` → `requireRegisteredUser` → `requireAdmin` progression

### **Database Design Philosophy**
- **Type-Safe Queries**: All database operations use Kysely with generated TypeScript types
- **Multi-User Device Support**: Composite primary keys enable multiple users per device
- **User Activity Tracking**: Last used timestamps for device usage analytics
- **Transaction Safety**: Complex operations wrapped in database transactions
- **Performance First**: Query optimization through Kysely's query builder
- **Schema Evolution**: Migrations handle database schema changes safely

### **API Design Patterns**
- **RESTful Endpoints**: Standard HTTP methods with consistent response formats
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Rate Limiting**: Tiered rate limits based on endpoint sensitivity
- **Input Validation**: Request validation and sanitization at middleware level

### **Caching & Performance**
- **Redis Integration**: Session caching and rate limiting when available
- **Fallback Strategy**: Memory-based alternatives when Redis unavailable
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Kysely provides automatic query optimization

## 🛡️ Security Features

- **Rate Limiting**: Different limits for different endpoints
- **Authentication**: Firebase ID token verification with guest support
- **Authorization**: Role-based access control with Firebase custom claims
- **Input Validation**: Request validation and sanitization
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Error Handling**: Secure error responses

## 📊 Monitoring & Logging

- Request/response logging
- Error tracking
- Performance monitoring
- Health check endpoint: `GET /health`

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   # Set all production environment variables
   ```

2. **Database Setup**
   ```bash
   npm run db:migrate
   ```

3. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔄 Data Flow

1. **Authentication**: Firebase handles user auth, server verifies tokens
2. **Caching**: Redis caches frequently accessed data
3. **Database**: PostgreSQL stores all persistent game data
4. **Real-time**: WebSocket connections for live game features

## 📚 Technical Implementation Guide

### **Understanding the Database Layer**
- **Kysely Query Builder**: Type-safe SQL query construction with TypeScript integration
- **Multi-User Device Schema**: Composite primary keys `(device_id, user_id)` for shared device support
- **User Activity Tracking**: `last_used_at` timestamps for device usage monitoring
- **Schema Management**: Database migrations handle schema evolution
- **Type Generation**: Database types auto-generated from schema for compile-time safety
- **Transaction Patterns**: Complex operations wrapped in database transactions for consistency

### **Authentication Architecture**
- **Firebase Integration**: Leverages Firebase Auth for user management and token verification
- **Guest User Support**: Anonymous users can access game features without registration
- **Role-Based Access**: Three-tier system (guest → user → admin) with Firebase custom claims
- **Session Management**: Redis-based caching with Firebase UID as cache keys

### **API Design Philosophy**
- **Resource-Based URLs**: RESTful endpoint design following standard conventions
- **Middleware Pipeline**: Request → Auth → Validation → Rate Limiting → Handler → Response
- **Error Consistency**: Structured error responses with proper HTTP status codes
- **Input Sanitization**: All user input validated and sanitized at middleware level

### **Performance & Scalability**
- **Caching Strategy**: Multi-layer caching (Redis for sessions, application-level for static data)
- **Database Optimization**: Kysely query optimization with proper indexing strategies
- **Rate Limiting**: Tiered limits based on endpoint sensitivity and user type
- **Connection Management**: Efficient database connection pooling and lifecycle management

### **Development Best Practices**
- **Type Safety First**: All database operations use generated TypeScript types
- **Error Handling**: Comprehensive error catching with graceful degradation
- **Environment Flexibility**: Graceful fallbacks when optional services (Redis) unavailable
- **Security by Design**: Input validation, rate limiting, and proper authentication at every layer

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "auth"
npm test -- --grep "cards"
npm test -- --grep "game"

# Test build compilation
npm run build
```

## 📈 Performance

- **Caching Strategy**: Redis for user sessions and frequently accessed data
- **Database Optimization**: Kysely query optimization with proper indexing
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Connection Pooling**: Efficient database connection management via Kysely

## 🔧 Troubleshooting

### **Common Issues**

#### **Port Already in Use (EADDRINUSE)**
```bash
# Kill process using port 3001
npx kill-port 3001
# Or find and kill manually
lsof -ti:3001 | xargs kill -9
```

#### **TypeScript Compilation Errors**
```bash
# Clean build and reinstall
rm -rf node_modules dist
npm install
npm run build
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL connection
npm run db:test-connection
# Reset database if needed
npm run db:reset
```

#### **Firebase Authentication Errors**
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project
- Ensure service account JSON has proper permissions
- Check Firebase custom claims are set for admin users

#### **Redis Connection Issues**
- Server will fall back to memory-based rate limiting
- Check `REDIS_URL` environment variable
- Verify Redis server is running: `redis-cli ping`

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=biomasters:* npm run dev

# Check health endpoint
curl http://localhost:3001/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
