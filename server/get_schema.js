import { pool } from './configs/db.js';
import fs from 'fs';

async function run() {
  try {
    const res = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('return_requests', 'reverse_shipments', 'deliveries', 'returns') ORDER BY table_name, ordinal_position;");
    let out = '';
    let currentTable = '';
    for (const row of res.rows) {
      if (row.table_name !== currentTable) {
        out += '\nTable: ' + row.table_name + '\n';
        currentTable = row.table_name;
      }
      out += '  - ' + row.column_name + ' (' + row.data_type + ')\n';
    }
    fs.writeFileSync('schema_tables_2.txt', out);
    console.log('Schema extracted to schema_tables_2.txt');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
