/**
 * SQLite Database Schema for P2P Energy Trading
 */

export const SCHEMA = {
  // Providers table - tracks BPP trust scores
  providers: `
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trust_score REAL DEFAULT 0.5,
      total_orders INTEGER DEFAULT 0,
      successful_orders INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Catalog items table
  catalog_items: `
    CREATE TABLE IF NOT EXISTS catalog_items (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      delivery_mode TEXT NOT NULL,
      available_qty REAL NOT NULL,
      meter_id TEXT,
      production_windows_json TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )
  `,

  // Catalog offers table
  catalog_offers: `
    CREATE TABLE IF NOT EXISTS catalog_offers (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      price_value REAL NOT NULL,
      currency TEXT NOT NULL,
      max_qty REAL NOT NULL,
      time_window_json TEXT NOT NULL,
      offer_attributes_json TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES catalog_items(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    )
  `,

  // Orders table
  orders: `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      provider_id TEXT,
      selected_offer_id TEXT,
      total_qty REAL,
      total_price REAL,
      currency TEXT,
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (selected_offer_id) REFERENCES catalog_offers(id)
    )
  `,

  // Events table for logging
  events: `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      action TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('OUTBOUND', 'INBOUND')),
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Offer blocks table - represents individual 1-unit blocks for granular
  // trading
  offer_blocks: `
    CREATE TABLE IF NOT EXISTS offer_blocks (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'RESERVED', 'SOLD')),
      order_id TEXT,
      transaction_id TEXT,
      price_value REAL NOT NULL,
      currency TEXT NOT NULL,
      time_window_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reserved_at DATETIME,
      sold_at DATETIME,
      FOREIGN KEY (offer_id) REFERENCES catalog_offers(id),
      FOREIGN KEY (item_id) REFERENCES catalog_items(id),
      FOREIGN KEY (provider_id) REFERENCES providers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `,

  // Index for faster event lookups
  events_index: `
    CREATE INDEX IF NOT EXISTS idx_events_transaction_id ON events(transaction_id)
  `,

  events_message_index: `
    CREATE INDEX IF NOT EXISTS idx_events_message_id ON events(message_id)
  `,

  // Indexes for offer blocks
  blocks_offer_index: `
    CREATE INDEX IF NOT EXISTS idx_blocks_offer_id ON offer_blocks(offer_id)
  `,

  blocks_status_index: `
    CREATE INDEX IF NOT EXISTS idx_blocks_status ON offer_blocks(offer_id, status)
  `,

  // Phase-3: Verification cases table
  verification_cases: `
    CREATE TABLE IF NOT EXISTS verification_cases (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING', 'PROOFS_RECEIVED', 'VERIFYING', 'VERIFIED', 'DEVIATED', 'REJECTED', 'DISPUTED', 'FAILED', 'TIMEOUT')),
      required_proofs_json TEXT NOT NULL,
      tolerance_rules_json TEXT NOT NULL,
      window_json TEXT NOT NULL,
      expected_qty REAL NOT NULL,
      delivered_qty REAL,
      deviation_qty REAL,
      deviation_percent REAL,
      decision TEXT CHECK(decision IN ('ACCEPTED', 'REJECTED')),
      decided_at DATETIME,
      expires_at DATETIME NOT NULL,
      rejection_reason TEXT,
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `,

  // Phase-3: Proofs table
  proofs: `
    CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY,
      verification_case_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('METER_READING', 'TELEMETRY', 'ATTESTATION', 'OTP')),
      payload_json TEXT NOT NULL,
      source TEXT NOT NULL,
      quantity_value REAL,
      timestamp DATETIME NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      hash TEXT,
      raw_json TEXT NOT NULL,
      FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id)
    )
  `,

  // Phase-3: Settlements table
  settlements: `
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      verification_case_id TEXT,
      transaction_id TEXT NOT NULL,
      settlement_type TEXT NOT NULL CHECK(settlement_type IN ('DAILY', 'PERIODIC', 'IMMEDIATE')),
      state TEXT NOT NULL DEFAULT 'INITIATED' CHECK(state IN ('INITIATED', 'PENDING', 'SETTLED', 'FAILED')),
      amount_value REAL NOT NULL,
      currency TEXT NOT NULL,
      period_json TEXT,
      breakdown_json TEXT,
      initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      raw_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (verification_case_id) REFERENCES verification_cases(id)
    )
  `,

  // Indexes for Phase-3 tables
  verification_cases_order_index: `
    CREATE INDEX IF NOT EXISTS idx_verification_cases_order_id ON verification_cases(order_id)
  `,

  proofs_verification_case_index: `
    CREATE INDEX IF NOT EXISTS idx_proofs_verification_case_id ON proofs(verification_case_id)
  `,

  settlements_order_index: `
    CREATE INDEX IF NOT EXISTS idx_settlements_order_id ON settlements(order_id)
  `,
};

/**
 * Initialize database with all tables (works with sql.js)
 */
export function initializeSchema(db: any): void {
  try {
    db.run(SCHEMA.providers);
    db.run(SCHEMA.catalog_items);
    db.run(SCHEMA.catalog_offers);
    db.run(SCHEMA.orders);
    db.run(SCHEMA.events);
    db.run(SCHEMA.offer_blocks);
    db.run(SCHEMA.events_index);
    db.run(SCHEMA.events_message_index);
    db.run(SCHEMA.blocks_offer_index);
    db.run(SCHEMA.blocks_status_index);
    // Phase-3 tables
    db.run(SCHEMA.verification_cases);
    db.run(SCHEMA.proofs);
    db.run(SCHEMA.settlements);
    db.run(SCHEMA.verification_cases_order_index);
    db.run(SCHEMA.proofs_verification_case_index);
    db.run(SCHEMA.settlements_order_index);
  } catch (error: any) {
    // If there's an error, log it but continue - might be constraint issues
    console.warn('Schema initialization warning:', error?.message || error);
    // Try to create Phase-3 tables individually in case of foreign key issues
    try {
      db.run(SCHEMA.verification_cases);
    } catch (e) {
      console.warn('Failed to create verification_cases:', e);
    }
    try {
      db.run(SCHEMA.proofs);
    } catch (e) {
      console.warn('Failed to create proofs:', e);
    }
    try {
      db.run(SCHEMA.settlements);
    } catch (e) {
      console.warn('Failed to create settlements:', e);
    }
  }
}
