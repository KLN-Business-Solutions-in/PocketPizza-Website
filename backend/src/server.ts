import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { getPrisma } from './config/database';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  void getPrisma()
    .then((prisma) => prisma.$disconnect())
    .then(() => logger.info('Prisma disconnected'))
    .catch((err) => logger.error({ err }, 'Prisma disconnect failed'))
    .finally(() => {
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
