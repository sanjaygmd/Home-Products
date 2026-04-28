import { pool } from './configs/db.js';

async function fixSchema() {
  try {
    // 1. Ensure pgcrypto extension is enabled for gen_random_uuid()
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    
    // 2. Set default value for session_id
    await pool.query('ALTER TABLE auth_sessions ALTER COLUMN session_id SET DEFAULT gen_random_uuid()');
    
    console.log('Fixed auth_sessions schema: added gen_random_uuid() default to session_id');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing schema:', err);
    process.exit(1);
  }
}

fixSchema();
