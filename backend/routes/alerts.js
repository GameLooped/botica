const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all low-stock alerts
router.get('/', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT *, 
        CASE 
          WHEN stock = 0 THEN 'critico'
          WHEN stock <= stock_min * 0.5 THEN 'alto'
          ELSE 'medio'
        END as severity
      FROM products 
      WHERE stock <= stock_min
      ORDER BY stock ASC, name ASC
    `).all();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET alert count (for badge)
router.get('/count', (req, res) => {
  try {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= stock_min').get();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET expiry alerts (products expiring within 30 days)
router.get('/expiry', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT *,
        CAST(julianday(expiry_date) - julianday('now') AS INTEGER) as days_left
      FROM products
      WHERE expiry_date IS NOT NULL
        AND julianday(expiry_date) - julianday('now') <= 90
        AND julianday(expiry_date) >= julianday('now')
      ORDER BY expiry_date ASC
    `).all();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update stock_min threshold for a product
router.patch('/:id/threshold', (req, res) => {
  try {
    const { stock_min } = req.body;
    if (stock_min === undefined || stock_min < 0) return res.status(400).json({ error: 'stock_min inválido' });
    db.prepare('UPDATE products SET stock_min = ? WHERE id = ?').run(stock_min, req.params.id);
    res.json({ id: req.params.id, stock_min });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
