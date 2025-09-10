import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Debug: Check if DATABASE_URL is loaded
console.log('🔍 Environment check:');
console.log('  DATABASE_URL:', process.env['DATABASE_URL'] ? 'Present' : 'Missing');
console.log('  NODE_ENV:', process.env['NODE_ENV']);
console.log('  Working directory:', process.cwd());

// Import configurations and middleware
import { initializeFirebase } from './config/firebase';
import { initializeKysely } from './database/kysely';
import { initializeRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/logger';

// Import routes
import authRoutes from './routes/auth';
import guestAuthRoutes from './routes/guestAuth';
import userRoutes from './routes/users';
import cardRoutes from './routes/cards';
import deckRoutes from './routes/decks';
import syncRoutes from './routes/sync';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';
import localizationRoutes from './routes/localization';
import testRoutes from './routes/test';

// Import unified data loader factory
import { createProductionDataLoader, createDevelopmentDataLoader } from '../../shared/data/UnifiedDataLoader';

// Import WebSocket setup
import { setupGameSocket } from './websocket/gameSocket';

// Import game data manager
// DataLoader import removed - using direct file system loading instead

const app = express();
const PORT = process.env['PORT'] || 3001;

// Initialize services
async function initializeServices() {
  try {
    console.log('🔥 Initializing Firebase Admin SDK...');
    await initializeFirebase();

    // Try to connect to PostgreSQL (optional for now)
    try {
      console.log('🐘 Connecting to PostgreSQL with Kysely...');
      await initializeKysely();
      console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
      console.warn('⚠️  PostgreSQL not available, continuing without database');
      console.warn('   Install PostgreSQL to enable full functionality');
    }

    // Try to connect to Redis (optional)
    try {
      console.log('🔴 Connecting to Redis...');
      await initializeRedis();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️  Redis not available, using memory-based caching');
    }

    // Initialize server data loader
    try {
      console.log('📚 Initializing server data loader...');

      // Create data loader based on environment
      const isProduction = process.env['NODE_ENV'] === 'production';
      const dataPath = process.env['GAME_DATA_PATH'] || undefined;

      const serverDataLoader = isProduction
        ? createProductionDataLoader(dataPath)
        : createDevelopmentDataLoader(dataPath);

      // Preload commonly used data
      await serverDataLoader.preloadData();

      // Health check
      const isHealthy = await serverDataLoader.healthCheck();
      if (!isHealthy) {
        console.warn('⚠️  Server data loader health check failed');
      }

      // Store data loader globally for use in routes
      (global as any).serverDataLoader = serverDataLoader;

      // Log cache stats
      const stats = serverDataLoader.getCacheStats();
      console.log(`✅ Server data loader initialized (cache: ${stats.size} items)`);

    } catch (error) {
      console.error('❌ Failed to initialize server data loader:', error);
      console.error('   Game engine will not function without game data');
      // Don't exit - let server run without game data for now
    }

    console.log('✅ Core services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize core services:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static game data files for tests and client access
app.use('/game-config', express.static(require('path').join(__dirname, '../../public/data/game-config')));
app.use('/localization', express.static(require('path').join(__dirname, '../../public/data/localization')));

// Logging middleware
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/localization', localizationRoutes);

// Test routes (only available in non-production environments)
if (process.env['NODE_ENV'] !== 'production') {
  app.use('/api/test', testRoutes);
}

// 404 handler
app.use('*', (req, res) => {
  console.log('🚨🚨🚨 404 HANDLER HIT:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket for real-time game communication
const io = setupGameSocket(server);
if (io) {
  console.log('🔌 WebSocket server initialized');
} else {
  console.log('⚠️ WebSocket server disabled');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections (like database connection errors)
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection:', reason);
  console.error('🚨 Promise:', promise);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // For uncaught exceptions, we should exit gracefully
  console.log('🛑 Shutting down due to uncaught exception...');
  server.close(() => {
    process.exit(1);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      console.log(`🚀 Biomasters TCG API Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
