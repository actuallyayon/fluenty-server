import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { connectDB } from './db/index.js';
import { setupIndexes } from './db/indexes.js';
import { auth } from './auth.js';
import { authRateLimiter } from './middlewares/rate-limit.js';
import { errorHandler } from './middlewares/error.js';
import { userRoutes } from './routes/user.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { learningRoutes } from './routes/learning.routes.js';
import { practiceRoutes } from './routes/practice.routes.js';
import { aiRoutes } from './routes/ai.routes.js';
import { writingRoutes } from './routes/writing.routes.js';
import { speakingRoutes } from './routes/speaking.routes.js';
import { adminAiRoutes } from './routes/admin-ai.routes.js';
import { mockExamRoutes } from './routes/mock-exam.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';

const app = express();

// Ensure DB connection before processing requests (critical for Vercel serverless functions)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// 1. CORS Configuration with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.vercel.app') || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// 2. CRITICAL RULE: Mount Better Auth catch-all BEFORE express.json()
// Rate limiter applied to auth routes
app.use('/api/auth', authRateLimiter);
app.all('/api/auth/*', toNodeHandler(auth));

// 3. Body parsers mounted AFTER Better Auth
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Health Check Route
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Fluenty API Server',
    version: '1.0.0',
  });
});

// 5. Application API Routes
app.use('/api/admin/ai', adminAiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mock-exams', mockExamRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/speaking', speakingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
// Forward /api/me to /api/user/me for convenience
app.use('/api', userRoutes);

// 6. Centralized Error Handler
app.use(errorHandler);

// 7. Server Initialization
async function startServer(): Promise<void> {
  try {
    console.log('🚀 Initializing Fluenty API Server...');

    // Connect to MongoDB Atlas
    await connectDB();

    // Create database indexes
    await setupIndexes();

    const PORT = parseInt(env.PORT, 10) || 5000;
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` Fluenty API Server running on port ${PORT}`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` Client URL:  ${env.CLIENT_URL}`);
      console.log(` Health URL:  http://localhost:${PORT}/health`);
      console.log(` Auth URL:    http://localhost:${PORT}/api/auth`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
