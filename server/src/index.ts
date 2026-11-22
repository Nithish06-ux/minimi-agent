import { app } from './app.js';
import { config } from './config.js';
import { prisma } from './database/prisma.js';

const PORT = config.PORT || 3001;

async function startServer() {
  try {
    // Ensure DB connection is active
    await prisma.$connect();
    console.log(`[Database] SQLite connected via Prisma.`);

    app.listen(PORT, () => {
      console.log(`[Server] Minimi Research Agent Server running at http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${config.NODE_ENV} | Timezone: ${config.APP_TIMEZONE}`);
      console.log(`[Server] Mock AI Mode: ${config.MOCK_AI ? 'ENABLED (Offline deterministic mode)' : 'DISABLED (Using live OpenAI/Tavily APIs)'}`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize:', err);
    process.exit(1);
  }
}

startServer();
