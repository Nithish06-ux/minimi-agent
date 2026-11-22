import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow frontend dev server and direct clients
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
