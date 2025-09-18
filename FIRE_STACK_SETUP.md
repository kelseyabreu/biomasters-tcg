# 🔥 FIRE Stack Setup Guide for Biomasters TCG

Complete setup guide for the **FIRE stack** (Firebase, Express, Redis, PostgreSQL) implementation.

## 📋 Overview

Your Biomasters TCG now has a complete full-stack architecture:

- **Frontend**: React + Ionic + Firebase Auth (✅ Complete)
- **Backend**: Express + TypeScript API (✅ Complete)
- **Database**: PostgreSQL for game data (✅ Complete)
- **Cache**: Redis for performance (✅ Complete)
- **Auth**: Firebase Authentication (✅ Complete)

## 🚀 Quick Start (5 Minutes)

### 1. Set Up Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Create New Project**: `biomasters-tcg`
3. **Enable Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Email/Password** ✅
   - Enable **Google** ✅
4. **Get Web Config**:
   - Project Settings → General → Your apps → Add app → Web
   - Copy the config object
   - Update `.env.local` in your frontend

### 2. Set Up Firebase Admin SDK

1. **Generate Service Account**:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Update Backend Environment**:
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your Firebase Admin SDK credentials
   ```

### 3. Install Backend Dependencies

```bash
# Run the setup script
./setup-backend.bat    # Windows
./setup-backend.sh     # macOS/Linux

# Or manually:
cd server
npm install
```

### 4. Set Up PostgreSQL

```bash
# Install PostgreSQL (if not installed)
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# Create database
createdb biomasters_tcg

# Run migrations
cd server
npm run db:migrate
```

### 5. Set Up Redis (Optional but Recommended)

```bash
# Install Redis
# Windows: https://github.com/microsoftarchive/redis/releases
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server

# Start Redis
redis-server
```

### 6. Start Everything

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend (existing)
npm run dev

# Terminal 3: Start Redis (if not running as service)
redis-server
```

## 🔧 Detailed Configuration

### Frontend Configuration (.env.local)

```env
# Replace with your actual Firebase config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Backend API URL
VITE_API_BASE_URL=http://localhost:3001
```

### Backend Configuration (server/.env)

```env
# Server
PORT=3001
NODE_ENV=development

# Firebase Admin SDK (from downloaded JSON)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
# ... (see server/.env.example for complete list)

# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/biomasters_tcg
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biomasters_tcg
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your_super_secret_jwt_key_here
CORS_ORIGIN=http://localhost:5173
```

## 🧪 Testing the Setup

### 1. Test Frontend Authentication

1. Open http://localhost:5173
2. Click the login icon in the header
3. Try creating an account
4. Verify email/password and Google sign-in work

### 2. Test Backend API

```bash
# Health check
curl http://localhost:3001/health

# Test authentication (after logging in frontend)
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     http://localhost:3001/api/auth/profile
```

### 3. Test Database Connection

```bash
cd server
npm run db:migrate
# Should show: ✅ Migration '001_initial_schema' executed successfully
```

### 4. Test Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

## 🎮 Available Features

### ✅ Working Now
- **User Authentication**: Email/password, Google sign-in
- **User Registration**: Complete profile creation
- **Guest Account Migration**: Seamless upgrade from guest to registered
- **User Profiles**: View and edit profiles
- **Database Integration**: All user data persisted
- **Caching**: Redis caching for performance
- **Rate Limiting**: API protection
- **Admin Panel**: User management endpoints

### 🔄 Ready for Implementation
- **Card Collection Management**: API endpoints ready
- **Pack Opening System**: Server-side validation ready
- **Physical Card Redemption**: QR code system ready
- **Leaderboards**: Database schema ready
- **Achievements**: Tracking system ready
- **Daily Rewards**: Cooldown system ready

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/migrate-guest` - Migrate guest data

### User Management
- `GET /api/users/me` - Detailed user profile
- `GET /api/users/search` - Search users
- `GET /api/users/leaderboard` - Rankings

### Cards & Game
- `GET /api/cards/collection` - User's cards
- `POST /api/cards/open-pack` - Open booster pack
- `POST /api/cards/redeem-physical` - Redeem physical card
- `GET /api/game/decks` - User's decks
- `POST /api/game/decks` - Create deck

### Admin
- `GET /api/admin/users` - Manage users
- `GET /api/admin/analytics` - System analytics
- `POST /api/admin/physical-cards/generate` - Generate codes

## 🔒 Security Features

- **Firebase Authentication**: Industry-standard auth
- **JWT Token Verification**: Secure API access
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Secure data handling
- **CORS Protection**: Cross-origin security
- **SQL Injection Prevention**: Parameterized queries
- **Error Handling**: Secure error responses

## 🚀 Next Steps

### Immediate (This Week)
1. **Set up your Firebase project** with the guide above
2. **Configure environment variables** for both frontend and backend
3. **Test the authentication flow** end-to-end
4. **Verify database connectivity** and run migrations

### Short Term (Next 2 Weeks)
1. **Implement card data loading** from your existing species data
2. **Connect pack opening** to the real card system
3. **Add deck validation** with actual card ownership
4. **Implement daily rewards** system

### Medium Term (Next Month)
1. **Physical card integration** with QR code generation
2. **Real-time multiplayer** battles
3. **Tournament system** implementation
4. **Mobile app deployment** with Capacitor

## 🆘 Troubleshooting

### Common Issues

**Firebase Auth Not Working**
- Check if API keys are correct in `.env.local`
- Verify Firebase project has Authentication enabled
- Check browser console for CORS errors

**Backend Connection Failed**
- Verify PostgreSQL is running: `pg_ctl status`
- Check database exists: `psql -l | grep biomasters`
- Verify Redis is running: `redis-cli ping`

**Database Migration Failed**
- Check PostgreSQL connection string in `.env`
- Verify database user has CREATE permissions
- Check if database exists: `createdb biomasters_tcg`

**CORS Errors**
- Update `CORS_ORIGIN` in server `.env`
- Check frontend URL matches CORS settings
- Verify both servers are running on correct ports

### Getting Help

1. **Check the logs**: Both frontend and backend show detailed error messages
2. **Test individual components**: Use the health check endpoints
3. **Verify environment variables**: Double-check all configuration
4. **Check network connectivity**: Ensure all services can communicate

## 🎉 Success!

When everything is working, you should see:

- ✅ Frontend running on http://localhost:5173
- ✅ Backend API running on http://localhost:3001
- ✅ PostgreSQL database connected and migrated
- ✅ Redis cache connected and working
- ✅ Firebase authentication working
- ✅ User registration and login functional
- ✅ Guest account migration working

Your Biomasters TCG now has a production-ready, scalable backend architecture! 🚀
