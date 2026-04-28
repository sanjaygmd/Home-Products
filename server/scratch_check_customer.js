import { pool } from './configs/db.js';
import crypto from 'crypto';

const token = '...'; // I don't have the token
// I'll check by user_ref_id
const customerId = '04f5f0e4-4311-4313-92b7-33fd0167a565';

async function check() {
    const res = await pool.query("SELECT * FROM auth_sessions WHERE user_ref_id = $1", [customerId]);
    console.log("Sessions for customer:", JSON.stringify(res.rows, null, 2));
    
    const res2 = await pool.query("SELECT * FROM customers WHERE customer_id = $1", [customerId]);
    console.log("Customer data:", JSON.stringify(res2.rows, null, 2));
    
    process.exit();
}

check();
