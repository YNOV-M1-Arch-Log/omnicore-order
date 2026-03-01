const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Omnicore Order Service API',
      version: '1.0.0',
      description: 'API for managing orders with 5-state lifecycle and automatic stock decrement.',
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        OrderInput: {
          type: 'object',
          required: ['userId', 'countryId', 'items'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            countryId: { type: 'string', format: 'uuid' },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['countryProductId', 'quantity'],
                properties: {
                  countryProductId: { type: 'string', format: 'uuid' },
                  quantity: { type: 'integer', minimum: 1, example: 2 },
                },
              },
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            userId:      { type: 'string', format: 'uuid' },
            countryId:   { type: 'string', format: 'uuid' },
            status:      { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
            totalAmount: { type: 'number', format: 'float', example: 59.98 },
            currency:    { type: 'string', example: 'EUR' },
            items:       { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            createdAt:   { type: 'string', format: 'date-time' },
            updatedAt:   { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            orderId:          { type: 'string', format: 'uuid' },
            countryProductId: { type: 'string', format: 'uuid' },
            quantity:         { type: 'integer', example: 2 },
            unitPrice:        { type: 'number', format: 'float', example: 29.99 },
            currency:         { type: 'string', example: 'EUR' },
          },
        },
        OrderStatusUpdate: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['confirmed', 'shipped', 'delivered', 'cancelled'],
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg:      { type: 'string' },
                  param:    { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message:       { type: 'string' },
                status:        { type: 'integer' },
                correlationId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
