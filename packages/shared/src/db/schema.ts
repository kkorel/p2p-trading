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
  
  // Offer blocks table - represents individual 1-unit blocks for granular trading
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

  // Settlement records - manual escrow flow (Phase 4)
  settlement_records: `
    CREATE TABLE IF NOT EXISTS settlement_records (
      trade_id TEXT PRIMARY KEY,
      order_id TEXT,
      transaction_id TEXT,
      buyer_id TEXT,
      seller_id TEXT,
      principal REAL NOT NULL,
      fee REAL NOT NULL,
      total REAL NOT NULL,
      expires_at DATETIME NOT NULL,
      status TEXT NOT NULL,
      verification_outcome TEXT,
      funded_receipt TEXT,
      payout_receipt TEXT,
      funded_at DATETIME,
      verified_at DATETIME,
      payout_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  
  settlement_trade_index: `
    CREATE INDEX IF NOT EXISTS idx_settlement_trade_id ON settlement_records(trade_id)
  `,

  // AI Trading Agents - user-owned autonomous trading bots
  agents: `
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'platform',
      type TEXT NOT NULL CHECK(type IN ('buyer', 'seller')),
      status TEXT NOT NULL DEFAULT 'stopped' CHECK(status IN ('active', 'paused', 'stopped')),
      execution_mode TEXT NOT NULL DEFAULT 'approval' CHECK(execution_mode IN ('auto', 'approval')),
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Trade proposals from agents (for approval mode)
  trade_proposals: `
    CREATE TABLE IF NOT EXISTS trade_proposals (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('buy', 'sell')),
      offer_id TEXT,
      quantity REAL NOT NULL,
      price_per_unit REAL,
      total_price REAL,
      reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
      transaction_id TEXT,
      order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      executed_at DATETIME,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `,

  // Agent activity logs
  agent_logs: `
    CREATE TABLE IF NOT EXISTS agent_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('analysis', 'proposal', 'execution', 'approval', 'rejection', 'error', 'start', 'stop')),
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `,

  // Indexes for agents
  agents_owner_index: `
    CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id)
  `,

  agents_status_index: `
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
  `,

  proposals_agent_index: `
    CREATE INDEX IF NOT EXISTS idx_proposals_agent_id ON trade_proposals(agent_id)
  `,

  proposals_status_index: `
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON trade_proposals(status)
  `,

  agent_logs_agent_index: `
    CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id)
  `,
};

/**
 * Initialize database with all tables (works with sql.js)
 */
export function initializeSchema(db: any): void {
  db.run(SCHEMA.providers);
  db.run(SCHEMA.catalog_items);
  db.run(SCHEMA.catalog_offers);
  db.run(SCHEMA.orders);
  db.run(SCHEMA.events);
  db.run(SCHEMA.offer_blocks);
  db.run(SCHEMA.settlement_records);
  db.run(SCHEMA.events_index);
  db.run(SCHEMA.events_message_index);
  db.run(SCHEMA.blocks_offer_index);
  db.run(SCHEMA.blocks_status_index);
  db.run(SCHEMA.settlement_trade_index);
  // AI Agent tables
  db.run(SCHEMA.agents);
  db.run(SCHEMA.trade_proposals);
  db.run(SCHEMA.agent_logs);
  db.run(SCHEMA.agents_owner_index);
  db.run(SCHEMA.agents_status_index);
  db.run(SCHEMA.proposals_agent_index);
  db.run(SCHEMA.proposals_status_index);
  db.run(SCHEMA.agent_logs_agent_index);
}
