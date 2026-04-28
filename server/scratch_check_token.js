import crypto from 'crypto';
import { pool } from './configs/db.js';

async function checkToken() {
    const token = 'd25a9a352bcab8cfa9d6f17589e7bff6cd0063dda813290e45e0944efe7c0203';
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query('SELECT * FROM auth_sessions WHERE token_hash = $1', [hash]);
    console.log(result.rows[0]);
    process.exit(0);
}

checkToken();
