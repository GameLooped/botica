const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'nova_salud.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT UNIQUE,
    name        TEXT NOT NULL,
    category    TEXT,
    description TEXT,
    price_buy   REAL DEFAULT 0,
    price_sell  REAL NOT NULL,
    stock       INTEGER DEFAULT 0,
    stock_min   INTEGER DEFAULT 5,
    unit        TEXT DEFAULT 'unidad',
    expiry_date TEXT,
    supplier    TEXT,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    subtotal       REAL NOT NULL,
    discount       REAL DEFAULT 0,
    total          REAL NOT NULL,
    payment_method TEXT DEFAULT 'efectivo',
    customer_name  TEXT,
    notes          TEXT,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal   REAL NOT NULL
  );
`);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get();

if (productCount.c === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (code, name, category, description, price_buy, price_sell, stock, stock_min, unit, expiry_date, supplier)
    VALUES (@code, @name, @category, @description, @price_buy, @price_sell, @stock, @stock_min, @unit, @expiry_date, @supplier)
  `);

  const seedProducts = [
    // Analgésicos
    { code: 'P001', name: 'Paracetamol 500mg x 20 Tab', category: 'Analgésicos', description: 'Tabletas para alivio del dolor y fiebre', price_buy: 2.50, price_sell: 4.50, stock: 120, stock_min: 20, unit: 'caja', expiry_date: '2026-12-31', supplier: 'Farmacorp' },
    { code: 'P002', name: 'Ibuprofeno 400mg x 20 Tab', category: 'Analgésicos', description: 'Antiinflamatorio no esteroideo', price_buy: 3.00, price_sell: 5.80, stock: 85, stock_min: 15, unit: 'caja', expiry_date: '2026-08-15', supplier: 'Farmacorp' },
    { code: 'P003', name: 'Naproxeno 550mg x 10 Tab', category: 'Analgésicos', description: 'Analgésico antiinflamatorio', price_buy: 4.20, price_sell: 7.50, stock: 3, stock_min: 10, unit: 'caja', expiry_date: '2026-06-30', supplier: 'LabMed' },
    { code: 'P004', name: 'Tramadol 50mg x 10 Cap', category: 'Analgésicos', description: 'Analgésico opioide para dolor moderado-severo', price_buy: 8.00, price_sell: 14.00, stock: 40, stock_min: 10, unit: 'caja', expiry_date: '2026-10-20', supplier: 'Merck' },

    // Antibióticos
    { code: 'P005', name: 'Amoxicilina 500mg x 21 Cap', category: 'Antibióticos', description: 'Antibiótico de amplio espectro', price_buy: 5.50, price_sell: 9.00, stock: 60, stock_min: 12, unit: 'caja', expiry_date: '2026-09-30', supplier: 'GlaxoSmithKline' },
    { code: 'P006', name: 'Azitromicina 500mg x 3 Tab', category: 'Antibióticos', description: 'Antibiótico macrólido', price_buy: 6.00, price_sell: 11.50, stock: 4, stock_min: 8, unit: 'caja', expiry_date: '2026-07-15', supplier: 'Pfizer' },
    { code: 'P007', name: 'Ciprofloxacino 500mg x 14 Tab', category: 'Antibióticos', description: 'Fluoroquinolona de amplio espectro', price_buy: 7.00, price_sell: 12.00, stock: 35, stock_min: 10, unit: 'caja', expiry_date: '2027-01-31', supplier: 'Bayer' },

    // Antihistamínicos
    { code: 'P008', name: 'Loratadina 10mg x 10 Tab', category: 'Antihistamínicos', description: 'Antialérgico no sedante', price_buy: 2.00, price_sell: 3.80, stock: 95, stock_min: 20, unit: 'caja', expiry_date: '2027-03-31', supplier: 'Farmacorp' },
    { code: 'P009', name: 'Cetirizina 10mg x 10 Tab', category: 'Antihistamínicos', description: 'Antihistamínico para alergias', price_buy: 2.20, price_sell: 4.00, stock: 2, stock_min: 15, unit: 'caja', expiry_date: '2026-11-30', supplier: 'LabMed' },

    // Gastrointestinales
    { code: 'P010', name: 'Omeprazol 20mg x 14 Cap', category: 'Gastrointestinal', description: 'Inhibidor de bomba de protones', price_buy: 4.50, price_sell: 8.00, stock: 70, stock_min: 15, unit: 'caja', expiry_date: '2026-12-15', supplier: 'AstraZeneca' },
    { code: 'P011', name: 'Metoclopramida 10mg x 20 Tab', category: 'Gastrointestinal', description: 'Antiemético y procinético', price_buy: 2.80, price_sell: 5.00, stock: 45, stock_min: 10, unit: 'caja', expiry_date: '2026-08-31', supplier: 'Farmacorp' },
    { code: 'P012', name: 'Sales de Rehidratación Oral x 4 sob', category: 'Gastrointestinal', description: 'Rehidratación en diarreas y vómitos', price_buy: 1.50, price_sell: 2.80, stock: 80, stock_min: 20, unit: 'caja', expiry_date: '2027-06-30', supplier: 'OMS-Generic' },

    // Vitaminas y suplementos
    { code: 'P013', name: 'Vitamina C 1000mg x 30 Tab', category: 'Vitaminas', description: 'Suplemento vitamínico antioxidante', price_buy: 5.00, price_sell: 9.50, stock: 6, stock_min: 10, unit: 'frasco', expiry_date: '2027-02-28', supplier: 'Nature Made' },
    { code: 'P014', name: 'Complejo B x 60 Tab', category: 'Vitaminas', description: 'Complejo de vitaminas del grupo B', price_buy: 6.50, price_sell: 11.00, stock: 55, stock_min: 10, unit: 'frasco', expiry_date: '2027-04-30', supplier: 'Nature Made' },
    { code: 'P015', name: 'Zinc 20mg x 30 Tab', category: 'Vitaminas', description: 'Mineral esencial para el sistema inmune', price_buy: 4.00, price_sell: 7.50, stock: 38, stock_min: 8, unit: 'frasco', expiry_date: '2027-01-15', supplier: 'LabMed' },

    // Cardiovascular
    { code: 'P016', name: 'Enalapril 10mg x 30 Tab', category: 'Cardiovascular', description: 'IECA para hipertensión arterial', price_buy: 5.00, price_sell: 8.50, stock: 65, stock_min: 15, unit: 'caja', expiry_date: '2026-10-31', supplier: 'Merck' },
    { code: 'P017', name: 'Metformina 850mg x 30 Tab', category: 'Diabetes', description: 'Antidiabético oral, biguanida', price_buy: 4.00, price_sell: 7.00, stock: 50, stock_min: 12, unit: 'caja', expiry_date: '2027-01-31', supplier: 'Sanofi' },
    { code: 'P018', name: 'Atorvastatina 20mg x 30 Tab', category: 'Cardiovascular', description: 'Estatina para control del colesterol', price_buy: 7.00, price_sell: 12.50, stock: 42, stock_min: 10, unit: 'caja', expiry_date: '2026-09-30', supplier: 'Pfizer' },

    // Tópicos
    { code: 'P019', name: 'Diclofenaco Gel 1% x 50g', category: 'Tópicos', description: 'Antiinflamatorio de aplicación tópica', price_buy: 3.50, price_sell: 6.50, stock: 30, stock_min: 8, unit: 'tubo', expiry_date: '2026-11-30', supplier: 'Novartis' },
    { code: 'P020', name: 'Clotrimazol Crema 1% x 30g', category: 'Tópicos', description: 'Antifúngico tópico', price_buy: 3.00, price_sell: 5.50, stock: 25, stock_min: 8, unit: 'tubo', expiry_date: '2027-03-31', supplier: 'Bayer' },
  ];

  const insertMany = db.transaction((products) => {
    for (const p of products) insertProduct.run(p);
  });

  insertMany(seedProducts);
  console.log(`✅ Base de datos inicializada con ${seedProducts.length} productos de prueba.`);
}

module.exports = db;
