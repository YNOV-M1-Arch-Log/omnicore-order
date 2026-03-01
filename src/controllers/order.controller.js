const orderService = require('../services/order.service');
const { logger } = require('../config/logger');

class OrderController {
  async create(req, res, next) {
    try {
      const userId = req.headers['x-user-id'];
      const { countryId, items } = req.body;
      const correlationId = req.correlationId ? req.correlationId() : undefined;
      const order = await orderService.createOrder({ userId, countryId, items }, correlationId);
      logger.info({ orderId: order.id, userId }, 'Order created');
      res.status(201).json(order);
    } catch (error) {
      logger.error({ err: error }, 'Failed to create order');
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { userId, status, countryId } = req.query;
      const filters = {};
      if (userId) filters.userId = userId;
      if (status) filters.status = status;
      if (countryId) filters.countryId = countryId;

      const orders = await orderService.getAll(filters);
      res.json(orders);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch orders');
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await orderService.getById(req.params.id);
      res.json(order);
    } catch (error) {
      logger.error({ err: error, id: req.params.id }, 'Failed to fetch order');
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const order = await orderService.updateStatus(req.params.id, req.body.status);
      logger.info({ orderId: order.id, status: order.status }, 'Order status updated');
      res.json(order);
    } catch (error) {
      logger.error({ err: error, id: req.params.id }, 'Failed to update order status');
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await orderService.deleteOrder(req.params.id);
      logger.info({ orderId: req.params.id }, 'Order deleted');
      res.status(204).send();
    } catch (error) {
      logger.error({ err: error, id: req.params.id }, 'Failed to delete order');
      next(error);
    }
  }
}

module.exports = new OrderController();
