import { pool } from '../configs/db.js';

export const runMigration = async () => {
  try {

    
    // 1. Drop system_config if it exists (as requested)
    await pool.query(`DROP TABLE IF EXISTS system_config`);

    // 2. Add master_key column to super_admins if it doesn't exist
    // Note: ALTER TABLE doesn't support parameterized DEFAULT values directly.
    // We will add the column and then update it.
    await pool.query(`
      ALTER TABLE super_admins 
      ADD COLUMN IF NOT EXISTS master_key character varying(255)
    `);

    // Set the default/initial value for existing rows
    const masterKey = process.env.MASTER_SECURITY_KEY || 'HOME_ADMIN_2026';
    await pool.query(`
      UPDATE super_admins SET master_key = $1 WHERE master_key IS NULL
    `, [masterKey]);

    // Set the default for future rows
    await pool.query(`
      ALTER TABLE super_admins ALTER COLUMN master_key SET DEFAULT '${masterKey}'
    `);


  } catch (error) {
    console.error("Migration Failed:", error);
  }
};
