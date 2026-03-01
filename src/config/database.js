const { getPrisma, disconnectDB } = require('@omnicore/db');
const { logger } = require('./logger');

// getPrisma() is safe here: server.js calls require('dotenv').config() before this module loads.
const prisma = getPrisma();

const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, '❌ Database connection failed');
    process.exit(1);
  }
};

module.exports = { prisma, connectDB, disconnectDB };
