/**
 * Event Types for logging and correlation
 */
export type EventDirection = 'OUTBOUND' | 'INBOUND';
export interface EventRecord {
    id?: number;
    transaction_id: string;
    message_id: string;
    action: string;
    direction: EventDirection;
    raw_json: string;
    created_at: string;
}
