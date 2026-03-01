require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const config = require('./config');
const { logger } = require('./config/logger');

const PORT = config.port;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Order Service running on port ${PORT}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
    });

    const gracefulShutdown = () => {
      logger.warn('🛑 Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        logger.info('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error({ err: error }, '❌ Failed to start server');
    process.exit(1);
  }
};

startServer();
