/**
 * Order management for BPP Mock
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from './db';
import { Order, OrderStatus, OrderItem, Quote } from '@p2p/shared';

function rowToObject(columns: string[], values: any[]): any {
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = values[i];
  });
  return obj;
}

/**
 * Get order by transaction ID
 */
export function getOrderByTransactionId(transactionId: string): Order | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM orders WHERE transaction_id = ?', [transactionId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = rowToObject(result[0].columns, result[0].values[0]);
  const rawData = JSON.parse(row.raw_json);
  
  return {
    id: row.id,
    transaction_id: row.transaction_id,
    status: row.status as OrderStatus,
    items: rawData.items || [],
    quote: rawData.quote || {
      price: { value: row.total_price, currency: row.currency },
      totalQuantity: row.total_qty,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Get order by ID
 */
export function getOrderById(orderId: string): Order | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM orders WHERE id = ?', [orderId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const row = rowToObject(result[0].columns, result[0].values[0]);
  const rawData = JSON.parse(row.raw_json);
  
  return {
    id: row.id,
    transaction_id: row.transaction_id,
    status: row.status as OrderStatus,
    items: rawData.items || [],
    quote: rawData.quote || {
      price: { value: row.total_price, currency: row.currency },
      totalQuantity: row.total_qty,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create a new order (draft/pending state)
 */
export function createOrder(
  transactionId: string,
  providerId: string,
  offerId: string,
  items: OrderItem[],
  quote: Quote,
  status: OrderStatus = 'PENDING'
): Order {
  const db = getDb();
  const orderId = uuidv4();
  const now = new Date().toISOString();
  
  const rawJson = JSON.stringify({ items, quote });
  
  db.run(
    `INSERT INTO orders (id, transaction_id, status, provider_id, selected_offer_id, total_qty, total_price, currency, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, transactionId, status, providerId, offerId, quote.totalQuantity, quote.price.value, quote.price.currency, rawJson, now, now]
  );
  saveDb();
  
  return {
    id: orderId,
    transaction_id: transactionId,
    status,
    items,
    quote,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update order status
 */
export function updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
    [status, now, orderId]
  );
  saveDb();
  
  return getOrderById(orderId);
}

/**
 * Update order by transaction ID
 */
export function updateOrderStatusByTransactionId(transactionId: string, status: OrderStatus): Order | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE orders SET status = ?, updated_at = ? WHERE transaction_id = ?`,
    [status, now, transactionId]
  );
  saveDb();
  
  return getOrderByTransactionId(transactionId);
}

/**
 * Get all orders for a provider
 */
export function getOrdersByProviderId(providerId: string): Order[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM orders WHERE provider_id = ? ORDER BY created_at DESC', [providerId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    const rawData = JSON.parse(row.raw_json);
    
    return {
      id: row.id,
      transaction_id: row.transaction_id,
      status: row.status as OrderStatus,
      provider_id: row.provider_id,
      items: rawData.items || [],
      quote: rawData.quote || {
        price: { value: row.total_price, currency: row.currency },
        totalQuantity: row.total_qty,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

/**
 * Get all orders
 */
export function getAllOrders(): Order[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM orders ORDER BY created_at DESC');
  
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  return result[0].values.map(values => {
    const row = rowToObject(result[0].columns, values);
    const rawData = JSON.parse(row.raw_json);
    
    return {
      id: row.id,
      transaction_id: row.transaction_id,
      status: row.status as OrderStatus,
      provider_id: row.provider_id,
      items: rawData.items || [],
      quote: rawData.quote || {
        price: { value: row.total_price, currency: row.currency },
        totalQuantity: row.total_qty,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}
