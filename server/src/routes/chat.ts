import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { executeAgent } from '../agent/orchestrator.js';
import { validate } from '../middleware/validate.js';

export const chatRouter = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  stream: z.boolean().optional().default(false),
  referenceDateUtc: z.string().datetime().optional(),
});

/**
 * POST /api/chat
 * Primary agent interaction endpoint supporting both JSON and SSE streaming responses
 */
chatRouter.post(
  '/',
  validate(chatRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, conversationId, stream, referenceDateUtc } = req.body;
      const refDate = referenceDateUtc ? new Date(referenceDateUtc) : new Date();

      if (stream) {
        // Configure Server-Sent Events headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const sendSse = (event: string, data: unknown) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
          const result = await executeAgent({
            conversationId,
            message,
            referenceDateUtc: refDate,
            onStep: (step) => {
              sendSse('step', step);
            },
          });

          sendSse('response', result);
          sendSse('done', { success: true });
          res.end();
        } catch (agentErr) {
          console.error('[ChatRouter SSE Error]', agentErr);
          sendSse('error', { message: (agentErr as Error).message });
          res.end();
        }
      } else {
        // Standard JSON response
        const result = await executeAgent({
          conversationId,
          message,
          referenceDateUtc: refDate,
        });

        res.json({ success: true, data: result });
      }
    } catch (err) {
      next(err);
    }
  }
);
