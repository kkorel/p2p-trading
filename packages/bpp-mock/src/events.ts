/**
 * Event logging for BPP Mock
 */

import { getDb, saveDb } from './db';
import { EventDirection } from '@p2p/shared';

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
