import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma.js';
import { validate } from '../middleware/validate.js';

export const conversationsRouter = Router();

const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

/**
 * GET /api/conversations
 * List all conversations ordered by recent activity
 */
conversationsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const result = conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
conversationsRouter.post(
  '/',
  validate(createConversationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title = 'New Research Session' } = req.body;
      const conversation = await prisma.conversation.create({
        data: { title },
      });
      res.status(201).json({ data: conversation });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/conversations/:id
 * Retrieve specific conversation with messages, sessions, evidence, and comparisons
 */
conversationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        researchSessions: {
          orderBy: { createdAt: 'desc' },
          include: {
            evidence: true,
            comparisons: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ data: conversation });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation and associated cascade records
 */
conversationsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await prisma.conversation.delete({ where: { id } });
    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
});
