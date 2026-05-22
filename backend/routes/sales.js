const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all sales (with pagination and date filter)
router.get('/', (req, res) => {
  try {
    const { date_from, date_to, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (date_from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const sales = db.prepare(query).all(...params);

    // Attach items to each sale
    const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
    const result = sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id)
    }));

    // Total count
    let countQuery = 'SELECT COUNT(*) as total FROM sales WHERE 1=1';
    const countParams = [];
    if (date_from) { countQuery += ' AND DATE(created_at) >= ?'; countParams.push(date_from); }
    if (date_to) { countQuery += ' AND DATE(created_at) <= ?'; countParams.push(date_to); }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ sales: result, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single sale with items
router.get('/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new sale (transaction: reduce stock + register sale)
router.post('/', (req, res) => {
  try {
    const { items, payment_method, customer_name, notes, discount = 0 } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'La venta debe tener al menos un producto' });

    const createSale = db.transaction(() => {
      // Validate and compute totals
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw new Error(`Producto ID ${item.product_id} no encontrado`);
        if (product.stock < item.quantity) throw new Error(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`);

        const itemSubtotal = item.unit_price * item.quantity;
        subtotal += itemSubtotal;
        validatedItems.push({ product, quantity: item.quantity, unit_price: item.unit_price, subtotal: itemSubtotal });
      }

      const total = subtotal - (discount || 0);

      // Insert sale header
      const saleResult = db.prepare(`
        INSERT INTO sales (subtotal, discount, total, payment_method, customer_name, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(subtotal, discount, total, payment_method || 'efectivo', customer_name || null, notes || null);

      const saleId = saleResult.lastInsertRowid;

      // Insert sale items and reduce stock
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

      for (const item of validatedItems) {
        insertItem.run(saleId, item.product.id, item.product.name, item.quantity, item.unit_price, item.subtotal);
        reduceStock.run(item.quantity, item.product.id);
      }

      return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    });

    const sale = createSale();
    const items_result = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    res.status(201).json({ ...sale, items: items_result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET daily summary stats
router.get('/stats/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_ticket
      FROM sales WHERE DATE(created_at) = ?
    `).get(today);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
