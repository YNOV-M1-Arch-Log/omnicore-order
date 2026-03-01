const { prisma } = require('../config/database');

class OrderRepository {
  create(data) {
    const { items, ...orderData } = data;
    return prisma.order.create({
      data: {
        ...orderData,
        items: { create: items },
      },
      include: {
        items: true,
      },
    });
  }

  findAll({ userId, status, countryId } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (countryId) where.countryId = countryId;

    return prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { countryProduct: true },
        },
      },
    });
  }

  update(id, data) {
    return prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  delete(id) {
    return prisma.order.delete({ where: { id } });
  }
}

module.exports = new OrderRepository();
