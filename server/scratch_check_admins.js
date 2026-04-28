import { pool } from './configs/db.js';

async function checkAdmins() {
    try {
        const admins = await pool.query("SELECT * FROM admins");
        console.log("Admins:", admins.rows);
        
        const superAdmins = await pool.query("SELECT * FROM super_admins");
        console.log("Super Admins:", superAdmins.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmins();
