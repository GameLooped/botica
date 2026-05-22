const express = require('express');
const cors = require('cors');
const db = require('./database');

const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const alertsRouter = require('./routes/alerts');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const now = new Date().toLocaleTimeString('es-PE');
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nova Salud API funcionando correctamente' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║    🏥 Nova Salud - API Backend       ║');
  console.log(`║    Puerto: http://localhost:${PORT}     ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});
