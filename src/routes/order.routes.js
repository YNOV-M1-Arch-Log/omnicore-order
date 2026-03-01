const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { body, param, query, validationResult } = require('express-validator');

const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Order taking and fulfillment lifecycle management
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place a new order (Order Taking)
 *     description: |
 *       Validates product availability and stock, computes the total amount,
 *       persists the order and automatically decrements stock in the product service.
 *       Optionally accepts a shipping address and customer notes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: CountryProduct not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Insufficient stock, product unavailable, or invalid country
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  [
    body('countryId').isUUID().withMessage('Valid country ID (UUID) is required'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
    body('items.*.countryProductId').isUUID().withMessage('Each item must have a valid countryProductId (UUID)'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be an integer >= 1'),
    body('shippingAddress').optional().isObject().withMessage('shippingAddress must be an object'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }).withMessage('notes must be a string up to 1000 chars'),
    validate,
  ],
  orderController.create,
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders with optional filters
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by country ID
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get(
  '/',
  [
    query('userId').optional().isUUID().withMessage('userId must be a valid UUID'),
    query('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    query('countryId').optional().isUUID().withMessage('countryId must be a valid UUID'),
    validate,
  ],
  orderController.getAll,
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get an order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    validate,
  ],
  orderController.getById,
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Advance order through its lifecycle (Order Processing)
 *     description: |
 *       Allowed transitions:
 *       - **pending → confirmed, cancelled**
 *       - **confirmed → shipped, cancelled**
 *       - **shipped → delivered**
 *       - delivered / cancelled → terminal (no further transitions)
 *
 *       When transitioning to `shipped`, provide `trackingNumber`, `shippingProvider`,
 *       and `estimatedDelivery` to record fulfillment details.
 *
 *       When transitioning to `cancelled`, provide `cancellationReason` and the service
 *       will automatically restore stock in the product service.
 *
 *       Lifecycle timestamps (`confirmedAt`, `shippedAt`, `deliveredAt`, `cancelledAt`)
 *       are set automatically on each transition.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderStatusUpdate'
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 *       422:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('status').isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    // Fulfillment fields (relevant when status = 'shipped')
    body('trackingNumber').optional().isString().trim().isLength({ max: 100 }).withMessage('trackingNumber must be a string up to 100 chars'),
    body('shippingProvider').optional().isString().trim().isLength({ max: 100 }).withMessage('shippingProvider must be a string up to 100 chars'),
    body('estimatedDelivery').optional().isISO8601().withMessage('estimatedDelivery must be a valid ISO 8601 date'),
    // Cancellation fields (relevant when status = 'cancelled')
    body('cancellationReason').optional().isString().trim().isLength({ max: 500 }).withMessage('cancellationReason must be a string up to 500 chars'),
    validate,
  ],
  orderController.updateStatus,
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Delete an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    validate,
  ],
  orderController.delete,
);

module.exports = router;
