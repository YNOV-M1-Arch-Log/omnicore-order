const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const pinoHttpMiddleware = require('./middlewares/pino-http');
const { correlationId, attachCorrelationId } = require('./middlewares/correlation');
const { logger } = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(correlationId());
app.use(attachCorrelationId);
app.use(pinoHttpMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'omnicore-order',
    correlationId: req.correlationId(),
  });
});

app.use('/api', require('./routes'));

app.use((err, req, res, _next) => {
  const correlationId = req.correlationId ? req.correlationId() : 'unknown';

  logger.error(
    {
      err,
      correlationId,
      status: err.status || 500,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    'Unhandled application error',
  );

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      correlationId,
    },
  });
});

module.exports = app;
