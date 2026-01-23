/**
 * SQLite Database Schema for P2P Energy Trading
 */
export declare const SCHEMA: {
    providers: string;
    catalog_items: string;
    catalog_offers: string;
    orders: string;
    events: string;
    offer_blocks: string;
    settlement_records: string;
    events_index: string;
    events_message_index: string;
    blocks_offer_index: string;
    blocks_status_index: string;
    settlement_trade_index: string;
};
/**
 * Initialize database with all tables (works with sql.js)
 */
export declare function initializeSchema(db: any): void;
