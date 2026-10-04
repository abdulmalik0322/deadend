import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { apiLimiter } from './middleware/rateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import experienceRoutes from './routes/experiences.js';
import decisionRoutes from './routes/decisions.js';
import categoryRoutes from './routes/categories.js';
import commentRoutes from './routes/comments.js';
import savedRoutes from './routes/saved.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/users.js';
import setupRoutes from './routes/setup.js';
import similarRoutes from './routes/similar.js';
import statsRoutes from './routes/stats.js';

const app = express();

// Security + parsing
app.use(helmet());
// CORS: explicit allowlist from CLIENT_URL; when unset, reflect the request
// origin in non-production only (deny in production). Credentials are
// disabled — auth uses Bearer tokens, never cookies.
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
      : process.env.NODE_ENV !== 'production',
    credentials: false,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Global rate limit for everything under /api
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'deadend-server', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/similar', similarRoutes);
app.use('/api/stats', statsRoutes);

// 404 + central error handling (order matters)
app.use(notFound);
app.use(errorHandler);

export default app;
