const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all products (with optional search/filter)
router.get('/', (req, res) => {
  try {
    const { search, category, low_stock } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR supplier LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (low_stock === 'true') {
      query += ' AND stock <= stock_min';
    }

    query += ' ORDER BY name ASC';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product
router.post('/', (req, res) => {
  try {
    const { code, name, category, description, price_buy, price_sell, stock, stock_min, unit, expiry_date, supplier } = req.body;
    if (!name || !price_sell) return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });

    const result = db.prepare(`
      INSERT INTO products (code, name, category, description, price_buy, price_sell, stock, stock_min, unit, expiry_date, supplier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code || null, name, category || null, description || null, price_buy || 0, price_sell, stock || 0, stock_min || 5, unit || 'unidad', expiry_date || null, supplier || null);

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProduct);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El código de producto ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  try {
    const { code, name, category, description, price_buy, price_sell, stock, stock_min, unit, expiry_date, supplier } = req.body;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

    db.prepare(`
      UPDATE products SET
        code = ?, name = ?, category = ?, description = ?,
        price_buy = ?, price_sell = ?, stock = ?, stock_min = ?,
        unit = ?, expiry_date = ?, supplier = ?
      WHERE id = ?
    `).run(
      code ?? existing.code,
      name ?? existing.name,
      category ?? existing.category,
      description ?? existing.description,
      price_buy ?? existing.price_buy,
      price_sell ?? existing.price_sell,
      stock ?? existing.stock,
      stock_min ?? existing.stock_min,
      unit ?? existing.unit,
      expiry_date ?? existing.expiry_date,
      supplier ?? existing.supplier,
      req.params.id
    );

    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update stock only
router.patch('/:id/stock', (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined) return res.status(400).json({ error: 'Stock requerido' });
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, req.params.id);
    res.json({ id: req.params.id, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET categories list
router.get('/meta/categories', (req, res) => {
  try {
    const cats = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
    res.json(cats.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
