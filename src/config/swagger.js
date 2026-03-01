const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Omnicore Order Service API',
      version: '1.0.0',
      description: 'Order taking (validate, stock-check, capture address) and order processing (fulfillment lifecycle, tracking, stock restoration on cancellation).',
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        ShippingAddress: {
          type: 'object',
          description: 'Delivery address provided at order time',
          properties: {
            street:     { type: 'string', example: '12 Rue de la Paix' },
            city:       { type: 'string', example: 'Paris' },
            postalCode: { type: 'string', example: '75001' },
            country:    { type: 'string', example: 'France' },
          },
        },
        OrderInput: {
          type: 'object',
          required: ['countryId', 'items'],
          properties: {
            countryId: { type: 'string', format: 'uuid', description: 'Country where the order is placed' },
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
            shippingAddress: {
              $ref: '#/components/schemas/ShippingAddress',
              description: 'Where to deliver the order (optional, can be set later)',
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              example: 'Please leave at the front desk',
              description: 'Special instructions or customer notes',
            },
          },
        },
        OrderStatusUpdate: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['confirmed', 'shipped', 'delivered', 'cancelled'],
              description: 'Target status. Must follow allowed transitions.',
            },
            // Shipping fields — relevant when status = 'shipped'
            trackingNumber: {
              type: 'string',
              maxLength: 100,
              example: '1Z9999AA0191234567',
              description: 'Carrier tracking number (set when shipping)',
            },
            shippingProvider: {
              type: 'string',
              maxLength: 100,
              example: 'DHL',
              description: 'Logistics provider name (set when shipping)',
            },
            estimatedDelivery: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-10T18:00:00.000Z',
              description: 'Expected delivery date (set when shipping)',
            },
            // Cancellation field — relevant when status = 'cancelled'
            cancellationReason: {
              type: 'string',
              maxLength: 500,
              example: 'Customer requested cancellation',
              description: 'Reason for cancellation. Stock is automatically restored.',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:                 { type: 'string', format: 'uuid' },
            userId:             { type: 'string', format: 'uuid' },
            countryId:          { type: 'string', format: 'uuid' },
            status:             { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
            totalAmount:        { type: 'number', format: 'float', example: 59.98 },
            currency:           { type: 'string', example: 'EUR' },
            // Order-taking fields
            shippingAddress:    { $ref: '#/components/schemas/ShippingAddress' },
            notes:              { type: 'string', example: 'Leave at front desk', nullable: true },
            // Fulfillment fields
            trackingNumber:     { type: 'string', example: '1Z9999AA0191234567', nullable: true },
            shippingProvider:   { type: 'string', example: 'DHL', nullable: true },
            estimatedDelivery:  { type: 'string', format: 'date-time', nullable: true },
            cancellationReason: { type: 'string', example: 'Out of stock', nullable: true },
            // Lifecycle timestamps
            confirmedAt:        { type: 'string', format: 'date-time', nullable: true },
            shippedAt:          { type: 'string', format: 'date-time', nullable: true },
            deliveredAt:        { type: 'string', format: 'date-time', nullable: true },
            cancelledAt:        { type: 'string', format: 'date-time', nullable: true },
            createdAt:          { type: 'string', format: 'date-time' },
            updatedAt:          { type: 'string', format: 'date-time' },
            items:              { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
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
