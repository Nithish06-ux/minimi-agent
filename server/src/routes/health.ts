import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { prisma } from '../database/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Quick DB ping
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      timezone: config.APP_TIMEZONE,
      mockMode: config.MOCK_AI,
      model: config.OPENAI_MODEL,
      embeddingModel: config.OPENAI_EMBEDDING_MODEL,
      hasOpenAIKey: !!config.OPENAI_API_KEY,
      hasTavilyKey: !!config.TAVILY_API_KEY,
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      error: (err as Error).message,
    });
  }
});
