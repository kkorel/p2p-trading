/**
 * Event logging for CDS Mock
 * Uses Redis for fast deduplication and Prisma for persistent storage
 */

import { prisma } from './db';
import { EventDirection, isMessageProcessed, markMessageProcessed } from '@p2p/shared';

/**
 * Log an event to the database
 */
export async function logEvent(
  transaction_id: string,
  message_id: string,
  action: string,
  direction: EventDirection,
  raw_json: string
): Promise<void> {
  await prisma.event.create({
    data: {
      transactionId: transaction_id,
      messageId: message_id,
      action,
      direction,
      rawJson: raw_json,
    },
  });
  
  // Also mark in Redis for fast deduplication
  await markMessageProcessed(message_id, direction);
}

/**
 * Check if we've already processed a message with this ID
 * Uses Redis for fast lookups
 * Checks only INBOUND direction to avoid conflicts with OUTBOUND events from other services
 */
export async function isDuplicateMessage(message_id: string): Promise<boolean> {
  // First check Redis (fast path)
  const inRedis = await isMessageProcessed(message_id, 'INBOUND');
  if (inRedis) {
    return true;
  }
  
  // Fallback to database check (for messages processed before Redis was added)
  // IMPORTANT: Filter by INBOUND direction to avoid matching OUTBOUND events
  const event = await prisma.event.findFirst({
    where: { 
      messageId: message_id,
      direction: 'INBOUND',
    },
    select: { id: true },
  });
  
  if (event) {
    // Cache in Redis for future checks
    await markMessageProcessed(message_id, 'INBOUND');
    return true;
  }
  
  return false;
}
