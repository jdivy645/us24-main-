/**
 * Schema migration.
 *
 * 16 §20 lists "Run migration validation when database changes" as a per-phase
 * quality command. This applies the schema and reports the resulting table set
 * so a change is visible rather than silent.
 */

import { applySchema, openDatabase } from './database.js';
import { loadConfig } from '../config.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);

applySchema(db);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as { name: string }[];

 
console.log(`Schema applied to ${config.databasePath}`);
 
console.log(`${tables.length} tables: ${tables.map((t) => t.name).join(', ')}`);

db.close();
