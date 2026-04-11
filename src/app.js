const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const pinoHttpMiddleware = require('./middlewares/pino-http');
const { correlationId, attachCorrelationId } = require('./middlewares/correlation');
const errorHandler = require('./middlewares/error-handler');

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

app.use(errorHandler);

module.exports = app;
