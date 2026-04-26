import { pool } from '../configs/db.js';

async function checkTypes() {
    try {
        const res = await pool.query("SELECT typname FROM pg_type WHERE typname LIKE '%transaction%'");
        console.log("Types found:", res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTypes();
