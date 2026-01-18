#!/bin/bash
# Migration script to add Phase-3 tables to existing database

DB_PATH="packages/bap/prosumer.db"

if [ ! -f "$DB_PATH" ]; then
    echo "Database file not found: $DB_PATH"
    exit 1
fi

echo "Adding Phase-3 tables to existing database..."

sqlite3 "$DB_PATH" << 'EOF'
-- Verification cases table
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
);

-- Proofs table
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
);

-- Settlements table
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_cases_order_id ON verification_cases(order_id);
CREATE INDEX IF NOT EXISTS idx_proofs_verification_case_id ON proofs(verification_case_id);
CREATE INDEX IF NOT EXISTS idx_settlements_order_id ON settlements(order_id);
EOF

if [ $? -eq 0 ]; then
    echo "✅ Phase-3 tables added successfully!"
    echo ""
    echo "Tables now in database:"
    sqlite3 "$DB_PATH" ".tables"
else
    echo "❌ Error adding Phase-3 tables"
    exit 1
fi
