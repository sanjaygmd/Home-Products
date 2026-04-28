import { pool } from '../configs/db.js';

export const fixSellerConstraints = async () => {
  try {
    console.log("Updating Seller Foreign Key Constraints...");

    const queries = [
      // 1. seller_payouts
      `ALTER TABLE seller_payouts DROP CONSTRAINT IF EXISTS seller_payouts_seller_id_fkey`,
      `ALTER TABLE seller_payouts ADD CONSTRAINT seller_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 2. seller_commissions
      `ALTER TABLE seller_commissions DROP CONSTRAINT IF EXISTS seller_commissions_seller_id_fkey`,
      `ALTER TABLE seller_commissions ADD CONSTRAINT seller_commissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 3. order_items (SET NULL to preserve order history)
      `ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_seller_id_fkey`,
      `ALTER TABLE order_items ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE SET NULL`,

      // 4. products
      `ALTER TABLE products DROP CONSTRAINT IF EXISTS products_seller_id_fkey`,
      `ALTER TABLE products ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 5. notifications
      `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_seller_id_fkey`,
      `ALTER TABLE notifications ADD CONSTRAINT notifications_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 6. addresses
      `ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_seller_id_fkey`,
      `ALTER TABLE addresses ADD CONSTRAINT addresses_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 7. Finances (Daily, Weekly, Monthly, Quarterly, Half-Yearly, Annual)
      `ALTER TABLE daily_finances DROP CONSTRAINT IF EXISTS daily_finances_seller_id_fkey`,
      `ALTER TABLE daily_finances ADD CONSTRAINT daily_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      `ALTER TABLE weekly_finances DROP CONSTRAINT IF EXISTS weekly_finances_seller_id_fkey`,
      `ALTER TABLE weekly_finances ADD CONSTRAINT weekly_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      `ALTER TABLE month_finances DROP CONSTRAINT IF EXISTS month_finances_seller_id_fkey`,
      `ALTER TABLE month_finances ADD CONSTRAINT month_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      `ALTER TABLE quarterly_finances DROP CONSTRAINT IF EXISTS quarterly_finances_seller_id_fkey`,
      `ALTER TABLE quarterly_finances ADD CONSTRAINT quarterly_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      `ALTER TABLE half_yearly_finances DROP CONSTRAINT IF EXISTS half_yearly_finances_seller_id_fkey`,
      `ALTER TABLE half_yearly_finances ADD CONSTRAINT half_yearly_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      `ALTER TABLE annual_finances DROP CONSTRAINT IF EXISTS annual_finances_seller_id_fkey`,
      `ALTER TABLE annual_finances ADD CONSTRAINT annual_finances_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 8. payments (SET NULL)
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_seller_id_fkey`,
      `ALTER TABLE payments ADD CONSTRAINT payments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE SET NULL`,

      // 9. reverse_shipments (SET NULL)
      `ALTER TABLE reverse_shipments DROP CONSTRAINT IF EXISTS reverse_shipments_seller_id_fkey`,
      `ALTER TABLE reverse_shipments ADD CONSTRAINT reverse_shipments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE SET NULL`,
      
      // 10. order_sellers
      `ALTER TABLE order_sellers DROP CONSTRAINT IF EXISTS order_sellers_seller_id_fkey`,
      `ALTER TABLE order_sellers ADD CONSTRAINT order_sellers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(seller_id) ON DELETE CASCADE`,

      // 11. finance_transactions (referencing seller_payouts)
      `ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_seller_payout_id_fkey`,
      `ALTER TABLE finance_transactions ADD CONSTRAINT finance_transactions_seller_payout_id_fkey FOREIGN KEY (seller_payout_id) REFERENCES seller_payouts(payout_id) ON DELETE SET NULL`,

      // 12. seller_commissions (referencing seller_payouts)
      `ALTER TABLE seller_commissions DROP CONSTRAINT IF EXISTS seller_commissions_payout_id_fkey`,
      `ALTER TABLE seller_commissions ADD CONSTRAINT seller_commissions_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES seller_payouts(payout_id) ON DELETE SET NULL`
    ];

    for (const query of queries) {
      await pool.query(query);
    }

    console.log("Seller Foreign Key Constraints Updated Successfully.");
  } catch (error) {
    console.error("Migration Failed (Seller Constraints):", error);
  }
};
