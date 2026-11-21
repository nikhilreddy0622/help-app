import { env } from './config/env';
import { createApp } from './app';
import { logger, prisma } from './lib/core';
import { startJobs, stopJobs } from './jobs';
import { checkMediaConfig } from './modules/media/routes';

const app = createApp();
const server = app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

checkMediaConfig(logger).catch(() => undefined);
if (env.RUN_JOBS) startJobs().catch((e) => logger.error({ err: e }, 'jobs failed to start'));

// Graceful shutdown (Render sends SIGTERM on deploy).
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await stopJobs().catch(() => undefined);
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
