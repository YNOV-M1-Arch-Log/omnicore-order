const { prisma } = require('../config/database');
const orderRepository = require('../repositories/order.repository');
const config = require('../config');
const { logger } = require('../config/logger');

const STATUS_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
};

class OrderService {
  async createOrder({ userId, countryId, items }, correlationId) {
    // 1. Fetch all referenced CountryProducts
    const cpIds = items.map((i) => i.countryProductId);
    const countryProducts = await prisma.countryProduct.findMany({
      where: { id: { in: cpIds } },
    });

    if (countryProducts.length !== cpIds.length) {
      const found = new Set(countryProducts.map((cp) => cp.id));
      const missing = cpIds.filter((id) => !found.has(id));
      const err = new Error(`CountryProduct(s) not found: ${missing.join(', ')}`);
      err.status = 404;
      throw err;
    }

    // 2. Validate countryId and stock for each item
    for (const item of items) {
      const cp = countryProducts.find((p) => p.id === item.countryProductId);
      if (cp.countryId !== countryId) {
        const err = new Error(
          `CountryProduct ${cp.id} does not belong to country ${countryId}`,
        );
        err.status = 422;
        throw err;
      }
      if (item.quantity > cp.quantity) {
        const err = new Error(
          `Insufficient stock for ${cp.id}: requested ${item.quantity}, available ${cp.quantity}`,
        );
        err.status = 422;
        throw err;
      }
    }

    // 3. Compute totalAmount and currency
    const currency = countryProducts[0].currency || 'EUR';
    let totalAmount = 0;
    for (const item of items) {
      const cp = countryProducts.find((p) => p.id === item.countryProductId);
      totalAmount += Number(cp.price) * item.quantity;
    }

    // 4. Create Order + OrderItems in a transaction
    const order = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          userId,
          countryId,
          status: 'pending',
          totalAmount,
          currency,
          items: {
            create: items.map((item) => {
              const cp = countryProducts.find((p) => p.id === item.countryProductId);
              return {
                countryProductId: item.countryProductId,
                quantity: item.quantity,
                unitPrice: cp.price,
                currency: cp.currency || currency,
              };
            }),
          },
        },
        include: { items: true },
      });
    });

    // 5. Decrement stock in product service for each item
    for (const item of items) {
      const cp = countryProducts.find((p) => p.id === item.countryProductId);
      const newQuantity = cp.quantity - item.quantity;
      try {
        const response = await fetch(
          `${config.productServiceUrl}/api/country-products/${cp.id}/stock`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-Id': correlationId || 'unknown',
            },
            body: JSON.stringify({ quantity: newQuantity }),
          },
        );
        if (!response.ok) {
          logger.warn(
            { countryProductId: cp.id, status: response.status },
            'Failed to decrement stock in product service',
          );
        }
      } catch (err) {
        logger.warn(
          { err, countryProductId: cp.id },
          'Error calling product service for stock update',
        );
      }
    }

    return order;
  }

  getAll(filters = {}) {
    return orderRepository.findAll(filters);
  }

  async getById(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }
    return order;
  }

  async updateStatus(id, status) {
    const order = await this.getById(id);
    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(status)) {
      const err = new Error(
        `Cannot transition from '${order.status}' to '${status}'`,
      );
      err.status = 422;
      throw err;
    }
    return orderRepository.update(id, { status });
  }

  async deleteOrder(id) {
    await this.getById(id);
    return orderRepository.delete(id);
  }
}

module.exports = new OrderService();
