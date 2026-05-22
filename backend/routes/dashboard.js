const express = require('express');
const router = express.Router();
const db = require('../database');

// GET full dashboard data
router.get('/', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's sales summary
    const todayStats = db.prepare(`
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_ticket
      FROM sales WHERE DATE(created_at) = ?
    `).get(today);

    // Total products in system
    const { total_products } = db.prepare('SELECT COUNT(*) as total_products FROM products').get();

    // Low stock count
    const { low_stock_count } = db.prepare('SELECT COUNT(*) as low_stock_count FROM products WHERE stock <= stock_min').get();

    // Out of stock count
    const { out_of_stock } = db.prepare('SELECT COUNT(*) as out_of_stock FROM products WHERE stock = 0').get();

    // Sales last 7 days (for chart)
    const weeklySales = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        COALESCE(SUM(total), 0) as revenue
      FROM sales
      WHERE DATE(created_at) >= DATE('now', '-6 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Fill missing days with zeros
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = weeklySales.find(s => s.date === dateStr);
      last7Days.push(found || { date: dateStr, sales_count: 0, revenue: 0 });
    }

    // Recent sales (last 5)
    const recentSales = db.prepare(`
      SELECT s.*, COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `).all();

    // Top selling products (all time)
    const topProducts = db.prepare(`
      SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
      FROM sale_items si
      GROUP BY si.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all();

    // Critical alerts (stock = 0 or very low)
    const criticalAlerts = db.prepare(`
      SELECT id, name, stock, stock_min, category
      FROM products WHERE stock <= stock_min
      ORDER BY stock ASC LIMIT 5
    `).all();

    res.json({
      today: todayStats,
      inventory: { total_products, low_stock_count, out_of_stock },
      weekly_sales: last7Days,
      recent_sales: recentSales,
      top_products: topProducts,
      critical_alerts: criticalAlerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
