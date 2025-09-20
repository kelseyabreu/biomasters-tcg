# BioMasters TCG - Complete Setup Guide

This guide covers the complete setup process for the BioMasters TCG project, including the monorepo structure, Redis integration, and Google Cloud Pub/Sub configuration.

## 🏗️ Project Architecture

BioMasters TCG uses a **monorepo architecture** with npm workspaces:

```
biomasters-tcg/
├── packages/
│   ├── shared/              # 📦 @kelseyabreu/shared (published npm package)
│   ├── server/             # 🚀 Backend API Server
│   └── frontend/           # 📱 React + Ionic Frontend
├── package.json            # Root workspace configuration
└── README.md
```

## 🚀 Quick Start Options

### Option 1: Frontend Only (Offline Mode)
Perfect for UI development and testing game mechanics without backend dependencies.

```bash
git clone <repository-url>
cd biomasters-tcg
npm install
npm run dev
# Open http://localhost:5173
```

**Features Available:**
- ✅ Complete game UI
- ✅ Offline game mechanics
- ✅ Card collection and deck building
- ✅ Single-player campaign mode
- ❌ No multiplayer features
- ❌ No user accounts

### Option 2: Basic Full Stack (No Redis)
API server with database but without Redis-dependent features.

```bash
# 1. Install dependencies
npm install

# 2. Setup server
cd packages/server
cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate

# 3. Start services
npm run dev  # Server on :3001
cd ../..
npm run dev  # Frontend on :5173
```

**Features Available:**
- ✅ All frontend features
- ✅ User authentication
- ✅ Database operations
- ✅ Basic API endpoints
- ⚠️ Matchmaking disabled (memory fallback)
- ❌ No real-time features

### Option 3: Complete Setup (Redis + Pub/Sub)
Full feature set including real-time matchmaking and distributed game workers.

```bash
# Follow "Complete Setup Guide" below
```

**Features Available:**
- ✅ All features from Option 2
- ✅ Real-time matchmaking
- ✅ WebSocket real-time features
- ✅ Distributed game workers
- ✅ Google Cloud Pub/Sub messaging
- ✅ Redis caching and session management

## 📋 Prerequisites

### Required for All Setups
- **Node.js 18+**
- **Git**

### Required for Backend (Options 2 & 3)
- **PostgreSQL 12+**
- **Firebase project** with Admin SDK

### Required for Full Setup (Option 3)
- **Google Cloud CLI**
- **Google Cloud Project** with:
  - Memorystore Redis instance
  - Pub/Sub API enabled
  - Compute Engine API enabled

## 🛠️ Complete Setup Guide (Option 3)

### Step 1: Repository Setup
```bash
# Clone and install
git clone <repository-url>
cd biomasters-tcg
npm install  # Installs all workspace dependencies
```

### Step 2: Google Cloud Setup

#### 2.1: Authentication
```bash
# Install Google Cloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2.2: Enable Required APIs
```bash
# Enable required Google Cloud APIs
gcloud services enable compute.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable vpcaccess.googleapis.com
```

#### 2.3: Create Redis Instance (if not exists)
```bash
# Create Memorystore Redis instance
gcloud redis instances create biomasters-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_6_x \
  --project=YOUR_PROJECT_ID
```

#### 2.4: Add Pub/Sub Permissions
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

#### 2.5: Create VM for SSH Tunnel
```bash
# Create VM for Redis tunnel
gcloud compute instances create biomasters-dev-vm \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=10GB \
  --project=YOUR_PROJECT_ID
```

### Step 3: Server Configuration

#### 3.1: Environment Setup
```bash
cd packages/server
cp .env.example .env
```

#### 3.2: Edit .env File
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

# Redis Configuration (for SSH tunnel)
REDIS_URL=rediss://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Google Cloud Pub/Sub
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Security
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-jwt-secret
```

#### 3.3: Database Setup
```bash
# Create database
createdb biomasters_tcg

# Run migrations
npm run db:migrate

# Import game data
npm run import-data
```

### Step 4: Start Services

#### 4.1: Start Redis Tunnel (Terminal 1)
```bash
cd packages/server
npm run redis:tunnel
# Keep this running - it creates the SSH tunnel to Redis
```

#### 4.2: Start Server (Terminal 2)
```bash
cd packages/server
npm start
# Server starts on http://localhost:3001
```

#### 4.3: Start Frontend (Terminal 3)
```bash
# From project root
npm run dev
# Frontend starts on http://localhost:5173
```

### Step 5: Verification

#### 5.1: Health Check
```bash
curl http://localhost:3001/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "redis": true,
    "firebase": true
  }
}
```

#### 5.2: Test Redis Features
```bash
cd packages/server
node test-redis-endpoints.js
```

**Expected Results:**
- ✅ Health endpoints working
- ✅ Guest user creation
- ✅ Matchmaking system working
- ✅ WebSocket connections
- ✅ Redis operations

## 🔧 Development Workflow

### Daily Development
```bash
# Terminal 1: Redis tunnel (start once, keep running)
cd packages/server && npm run redis:tunnel

# Terminal 2: Server (restart as needed)
cd packages/server && npm start

# Terminal 3: Frontend (restart as needed)
npm run dev
```

### Testing
```bash
# Test server functionality
cd packages/server
npm test

# Test Redis endpoints
node test-redis-endpoints.js

# Test specific game engine features
npm test -- ComprehensiveGameRules.integration.test.ts
```

### Building for Production
```bash
# Build shared package
cd packages/shared
npm run build
npm publish  # If updating shared package

# Build server
cd packages/server
npm run build

# Build frontend
npm run build
```

## 🚨 Troubleshooting

### Redis Connection Issues
```bash
# Check tunnel status
ps aux | grep "gcloud compute ssh"

# Restart tunnel
npm run redis:tunnel

# Test Redis manually
redis-cli -h localhost -p 6379 --tls --insecure ping
```

### Pub/Sub Permission Issues
```bash
# Verify permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Re-add if missing
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firebase-adminsdk-fbsvc@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"
```

### Server Issues
```bash
# Check logs
npm start | grep -E "(✅|❌|⚠️)"

# Clean restart
rm -rf node_modules dist
npm install
npm run build
npm start
```

## 📚 Additional Resources

- **Main README**: [README.md](README.md) - Project overview and game rules
- **Server README**: [packages/server/README.md](packages/server/README.md) - Detailed server documentation
- **API Documentation**: Available at `http://localhost:3001/api-docs` when server is running
- **Game Engine Tests**: Run `npm test` in `packages/server` for comprehensive test suite

## 🎯 Next Steps

1. **Development**: Start with Option 1 or 2 for initial development
2. **Full Features**: Set up Option 3 when you need real-time features
3. **Production**: Follow deployment guides in individual package READMEs
4. **Contributing**: See contributing guidelines in main README

---

**Need help?** Check the troubleshooting sections or create an issue in the repository.
