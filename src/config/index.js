require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
};
