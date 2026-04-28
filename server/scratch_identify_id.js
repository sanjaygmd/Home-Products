import { pool } from './configs/db.js';

async function checkId() {
    const id = 'b017594a-241f-4fe4-abf4-5117f32025ee';
    const seller = await pool.query('SELECT * FROM sellers WHERE seller_id = $1', [id]);
    const superAdmin = await pool.query('SELECT * FROM super_admins WHERE super_admin_id = $1', [id]);
    const admin = await pool.query('SELECT * FROM admins WHERE admin_id = $1', [id]);
    const customer = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [id]);
    
    console.log('ID:', id);
    console.log('In Sellers:', seller.rows.length);
    console.log('In Super Admins:', superAdmin.rows.length);
    console.log('In Admins:', admin.rows.length);
    console.log('In Customers:', customer.rows.length);
    process.exit(0);
}

checkId();
