import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { getPrisma } from './config/database';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});

let shuttingDown = false;

function shutdown(signal: string): void {
  // only the first signal owns the timer, close callback, and cleanup —
  // a second close() would error ("server not open") and exit mid-drain
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down');

  const forcedShutdown = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  // stop accepting connections and drain in-flight requests BEFORE dropping the
  // database pool, otherwise active requests can hit a disconnected client
  server.close(() => {
    logger.info('Server closed');
    void getPrisma()
      .then((prisma) => prisma.$disconnect())
      .then(() => logger.info('Prisma disconnected'))
      .catch((err) => logger.error({ err }, 'Prisma disconnect failed'))
      .finally(() => {
        clearTimeout(forcedShutdown);
        process.exit(0);
      });
  });
  // reap idle keep-alive sockets so the close callback can fire without
  // waiting out keepAliveTimeout/the forced-kill deadline
  server.closeIdleConnections();
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
