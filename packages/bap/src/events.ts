/**
 * Event logging for BAP
 */

import { getDb, saveDb } from './db';
import { EventDirection, rowToObject } from '@p2p/shared';

export function logEvent(
  transaction_id: string,
  message_id: string,
  action: string,
  direction: EventDirection,
  raw_json: string
): void {
  const db = getDb();
  db.run(
    `INSERT INTO events (transaction_id, message_id, action, direction, raw_json) VALUES (?, ?, ?, ?, ?)`,
    [transaction_id, message_id, action, direction, raw_json]
  );
  saveDb();
}

export function isDuplicateMessage(message_id: string): boolean {
  const db = getDb();
  const result = db.exec('SELECT 1 FROM events WHERE message_id = ?', [message_id]);
  return result.length > 0 && result[0].values.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEventsByTransactionId(transaction_id: string): any[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM events WHERE transaction_id = ? ORDER BY created_at', [transaction_id]);
  
  if (result.length === 0) return [];
  
  const cols = result[0].columns;
  return result[0].values.map(row => rowToObject(cols, row));
}
