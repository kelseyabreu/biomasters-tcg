# BioMasters TCG - Quick Reference

## 🚀 Quick Commands

### Start Development (Full Features)
```bash
# Terminal 1: Redis tunnel (keep running)
cd packages/server && npm run redis:tunnel

# Terminal 2: Server
cd packages/server && npm start

# Terminal 3: Frontend  
npm run dev
```

### Start Development (Basic - No Redis)
```bash
# Terminal 1: Server
cd packages/server && npm run dev

# Terminal 2: Frontend
npm run dev
```

### Health Checks
```bash
# Server health
curl http://localhost:3001/health

# Redis health
curl http://localhost:3001/health/ioredis

# Test Redis endpoints
cd packages/server && node test-redis-endpoints.js
```

## 🔧 Common Tasks

### Database Operations
```bash
cd packages/server

# Reset database
npm run db:reset

# Run migrations
npm run db:migrate

# Import game data
npm run import-data
```

### Testing
```bash
cd packages/server

# All tests
npm test

# Game engine tests
npm test -- ComprehensiveGameRules.integration.test.ts

# Redis endpoint tests
node test-redis-endpoints.js
```

### Building
```bash
# Build shared package
cd packages/shared && npm run build

# Build server
cd packages/server && npm run build

# Build frontend
npm run build
```

## 🌐 URLs & Endpoints

### Development URLs
- **Frontend**: http://localhost:5173
- **Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api-docs

### Key API Endpoints
```bash
# Authentication
POST /api/guest/create          # Create guest user
POST /api/auth/register         # Register user
GET  /api/auth/profile          # Get profile

# Game Data
GET  /api/cards/database        # Card database
GET  /api/cards/game-data       # Game data JSON

# Matchmaking
POST /api/matchmaking/find      # Join matchmaking
GET  /api/matchmaking/status    # Check status

# Health
GET  /health                    # General health
GET  /health/ioredis           # Redis health
```

## 🔍 Troubleshooting Quick Fixes

### Redis Issues
```bash
# Check tunnel
ps aux | grep "gcloud compute ssh"

# Restart tunnel
npm run redis:tunnel

# Test connection
redis-cli -h localhost -p 6379 --tls --insecure ping
```

### Server Issues
```bash
# Kill port
npx kill-port 3001

# Clean restart
rm -rf node_modules dist && npm install && npm run build

# Check logs
npm start | grep -E "(✅|❌|⚠️)"
```

### Database Issues
```bash
cd packages/server

# Reset and migrate
npm run db:reset && npm run db:migrate

# Test connection
npx tsx src/scripts/test-json-engine.ts
```

## 📊 Service Status Reference

### Expected Health Check Output
```json
{
  "status": "healthy",
  "timestamp": "2025-09-20T01:50:39.550Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 38.5041616,
  "services": {
    "database": true,    // ✅ PostgreSQL connected
    "redis": true,       // ✅ Redis via tunnel working
    "firebase": true     // ✅ Firebase Admin SDK working
  }
}
```

### Server Startup Success Indicators
```bash
✅ Firebase Admin SDK initialized successfully
✅ PostgreSQL connected successfully  
✅ Redis connected successfully
✅ IORedis connected successfully
✅ Pub/Sub initialization completed successfully
✅ Google Cloud Pub/Sub initialized successfully
✅ Distributed game worker system initialized successfully
✅ MatchmakingWorker started successfully
✅ MatchNotificationService started successfully
```

## 🎮 Feature Availability by Mode

| Feature | Frontend Only | Basic Server | Full Server |
|---------|---------------|--------------|-------------|
| **Game UI** | ✅ | ✅ | ✅ |
| **Offline Play** | ✅ | ✅ | ✅ |
| **User Auth** | ❌ | ✅ | ✅ |
| **Database** | ❌ | ✅ | ✅ |
| **API Endpoints** | ❌ | ✅ | ✅ |
| **Redis Cache** | ❌ | ⚠️ Memory | ✅ GCP Redis |
| **Matchmaking** | ❌ | ❌ | ✅ |
| **WebSocket** | ❌ | ✅ Basic | ✅ Real-time |
| **Game Workers** | ❌ | ❌ | ✅ |
| **Pub/Sub** | ❌ | ❌ | ✅ |

## 🔑 Environment Variables Quick Reference

### Required for Basic Server
```bash
# .env in packages/server/
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/biomasters_tcg
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@your-project.iam.gserviceaccount.com
```

### Additional for Full Server
```bash
# Redis Configuration
REDIS_URL=rediss://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Pub/Sub Configuration  
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

## 🛠️ Google Cloud Quick Commands

### Setup Commands
```bash
# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Add Pub/Sub permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

# Create tunnel VM
gcloud compute instances create biomasters-dev-vm \
  --zone=us-central1-a --machine-type=e2-micro \
  --image-family=debian-12 --image-project=debian-cloud
```

### Verification Commands
```bash
# Check VM status
gcloud compute instances list

# Check permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --filter="bindings.members:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Test SSH
gcloud compute ssh biomasters-dev-vm --zone=us-central1-a \
  --command="echo 'SSH works'"
```

## 📁 Project Structure Quick Reference

```
biomasters-tcg/
├── packages/
│   ├── shared/                 # @kelseyabreu/shared package
│   │   ├── src/types/         # TypeScript interfaces
│   │   ├── src/enums/         # Game constants
│   │   └── package.json       # Published to GitHub Packages
│   ├── server/                # Backend API
│   │   ├── src/routes/        # API endpoints
│   │   ├── src/services/      # Business logic
│   │   ├── src/config/        # Configuration
│   │   ├── .env               # Dev environment
│   │   └── start-redis-tunnel.bat # Redis tunnel script
│   └── frontend/              # React + Ionic app
│       ├── public/data/       # Game data JSON files
│       ├── src/components/    # UI components
│       └── src/services/      # Game engines
├── package.json               # Workspace root
├── README.md                  # Main documentation
├── SETUP.md                   # Complete setup guide
└── QUICK_REFERENCE.md         # This file
```

## 🎯 Development Tips

### Performance
- Keep Redis tunnel running to avoid reconnection delays
- Use `npm start` (not `npm run dev`) for server when testing Redis features
- Monitor server logs for connection status indicators

### Debugging
- Check health endpoints first: `/health` and `/health/ioredis`
- Use `node test-redis-endpoints.js` to verify full system functionality
- Look for ✅/❌/⚠️ indicators in server logs

### Testing
- Run `npm test` in `packages/server` for comprehensive game engine tests
- Use guest user creation for quick API testing
- WebSocket connections require valid authentication tokens

---

**💡 Tip**: Bookmark this file for quick reference during development!
