/**
 * Combined Database Connection using sql.js
 * Handles both BAP (consumer) and BPP (provider) data
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { initializeSchema } from '@p2p/shared';

const DB_PATH = path.join(__dirname, '..', 'prosumer.db');

let db: Database | null = null;

export async function initDb(): Promise<Database> {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  // Try to load existing database
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch {
    db = new SQL.Database();
  }
  
  initializeSchema(db);
  saveDb();
  
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

export async function waitForDb(): Promise<Database> {
  if (!db) {
    return initDb();
  }
  return db;
}
