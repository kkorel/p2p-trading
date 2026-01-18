/**
 * Order management for Seller (BPP) functionality
 * Using Prisma ORM for PostgreSQL persistence
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from './db';
import { Order, OrderStatus, OrderItem, Quote } from '@p2p/shared';

/**
 * Convert Prisma order to Order type
 */
function toOrder(dbOrder: any): Order {
  const items = JSON.parse(dbOrder.itemsJson || '[]');
  const quote = JSON.parse(dbOrder.quoteJson || '{}');
  
  return {
    id: dbOrder.id,
    transaction_id: dbOrder.transactionId,
    status: dbOrder.status as OrderStatus,
    items: items,
    quote: quote.price ? quote : {
      price: { value: dbOrder.totalPrice || 0, currency: dbOrder.currency || 'USD' },
      totalQuantity: dbOrder.totalQty || 0,
    },
    created_at: dbOrder.createdAt.toISOString(),
    updated_at: dbOrder.updatedAt.toISOString(),
  };
}

/**
 * Get order by transaction ID
 */
export async function getOrderByTransactionId(transactionId: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: { transactionId },
  });
  
  if (!order) {
    return null;
  }
  
  return toOrder(order);
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  
  if (!order) {
    return null;
  }
  
  return toOrder(order);
}

/**
 * Create a new order (draft/pending state)
 */
export async function createOrder(
  transactionId: string,
  providerId: string,
  offerId: string,
  items: OrderItem[],
  quote: Quote,
  status: OrderStatus = 'PENDING'
): Promise<Order> {
  const orderId = uuidv4();
  
  const order = await prisma.order.create({
    data: {
      id: orderId,
      transactionId,
      status,
      providerId,
      selectedOfferId: offerId,
      totalQty: quote.totalQuantity,
      totalPrice: quote.price.value,
      currency: quote.price.currency,
      itemsJson: JSON.stringify(items),
      quoteJson: JSON.stringify(quote),
    },
  });
  
  return {
    id: order.id,
    transaction_id: order.transactionId,
    status: order.status as OrderStatus,
    items,
    quote,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  
  return getOrderById(orderId);
}

/**
 * Update order by transaction ID
 */
export async function updateOrderStatusByTransactionId(transactionId: string, status: OrderStatus): Promise<Order | null> {
  await prisma.order.update({
    where: { transactionId },
    data: { status },
  });
  
  return getOrderByTransactionId(transactionId);
}

/**
 * Get all orders for a provider
 */
export async function getOrdersByProviderId(providerId: string): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
  });
  
  return orders.map(toOrder);
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  return orders.map(toOrder);
}
