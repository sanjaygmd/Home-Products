import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:Sanjay@888016@localhost:5433/home_products'
});

async function backfillDeliveries() {
  try {
    console.log("Starting backfill for 'deliveries' table...");
    
    const res = await pool.query(`
      SELECT order_id, courier, tracking_id, order_status, updated_at, placed_at
      FROM orders 
      WHERE order_status IN ('Processing', 'Shipped', 'Delivered')
      AND is_deleted = false
    `);

    console.log(`Found ${res.rows.length} relevant orders.`);

    for (const order of res.rows) {
      // Check if already exists
      const exists = await pool.query("SELECT delivery_id FROM deliveries WHERE order_id = $1", [order.order_id]);
      
      const dispatchedAt = (order.order_status === 'Shipped' || order.order_status === 'Delivered') ? order.updated_at : null;
      const deliveredAt = (order.order_status === 'Delivered') ? order.updated_at : null;

      if (exists.rows.length === 0) {
        await pool.query(`
          INSERT INTO deliveries (
              delivery_id, order_id, courier_name, awb_code, shipping_status, 
              dispatched_at, delivered_at, updated_at, created_at
          ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
          )
        `, [
          order.order_id, 
          order.courier || 'Manual', 
          order.tracking_id || 'N/A', 
          order.order_status,
          dispatchedAt,
          deliveredAt,
          order.updated_at,
          order.placed_at
        ]);
        console.log(`Created delivery record for order: ${order.order_id}`);
      } else {
        await pool.query(`
          UPDATE deliveries SET
            courier_name = $2,
            awb_code = $3,
            shipping_status = $4,
            dispatched_at = COALESCE(dispatched_at, $5),
            delivered_at = COALESCE(delivered_at, $6),
            updated_at = $7
          WHERE order_id = $1
        `, [
          order.order_id,
          order.courier || 'Manual',
          order.tracking_id || 'N/A',
          order.order_status,
          dispatchedAt,
          deliveredAt,
          order.updated_at
        ]);
        console.log(`Updated delivery record for order: ${order.order_id}`);
      }
    }

    console.log("Backfill completed successfully.");

  } catch (err) {
    console.error("BACKFILL ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

backfillDeliveries();
