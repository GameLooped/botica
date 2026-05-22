import { useState } from 'react';
import { useApi, useToast, fmt } from '../hooks.jsx';
import { api } from '../api';
import Modal from '../components/Modal';

function StockBar({ stock, stockMin }) {
  const pct = stockMin > 0 ? Math.min((stock / (stockMin * 3)) * 100, 100) : 100;
  const level = stock === 0 ? 'critical' : stock <= stockMin ? 'low' : 'ok';
  return (
    <div className="stock-bar-wrap">
      <div className="stock-bar">
        <div className={`stock-bar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`stock-num ${level}`}>{stock}</span>
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete, onStockUpdate }) {
  const [editingStock, setEditingStock] = useState(false);
  const [tempStock, setTempStock] = useState(product.stock);
  const { addToast } = useToast();

  const handleStockSave = async () => {
    try {
      await api.updateStock(product.id, Number(tempStock));
      onStockUpdate();
      setEditingStock(false);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const level = product.stock === 0 ? 'danger' : product.stock <= product.stock_min ? 'warning' : 'success';
  const levelText = product.stock === 0 ? 'Sin stock' : product.stock <= product.stock_min ? 'Bajo stock' : 'En stock';

  return (
    <tr>
      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{product.code || '—'}</td>
      <td>
        <div style={{ fontWeight: 600 }}>{product.name}</div>
        {product.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{product.description}</div>}
      </td>
      <td><span className="badge badge-muted">{product.category || '—'}</span></td>
      <td>
        {editingStock ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              className="input"
              style={{ width: 70, padding: '5px 8px' }}
              value={tempStock}
              min={0}
              onChange={e => setTempStock(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStockSave()}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handleStockSave}>✓</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setTempStock(product.stock); setEditingStock(false); }}>✕</button>
          </div>
        ) : (
          <div onClick={() => setEditingStock(true)} style={{ cursor: 'pointer' }} title="Click para editar stock">
            <StockBar stock={product.stock} stockMin={product.stock_min} />
          </div>
        )}
      </td>
      <td><span className={`badge badge-${level}`}>{levelText}</span></td>
      <td style={{ fontWeight: 600 }}>{fmt.currency(product.price_sell)}</td>
      <td style={{ color: 'var(--text-muted)' }}>{product.unit}</td>
      <td style={{ color: product.expiry_date && new Date(product.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: 12 }}>
        {fmt.date(product.expiry_date)}
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(product)} title="Editar">✏️</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(product)} title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const { addToast, ToastContainer } = useToast();

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (showLowOnly) params.set('low_stock', 'true');
    const q = params.toString();
    return q ? `?${q}` : '';
  };

  const { data: products, loading, reload } = useApi(
    () => api.getProducts(buildQuery()),
    [search, category, showLowOnly]
  );
  const { data: categories } = useApi(() => api.getCategories(), []);

  const [deleteProduct, setDeleteProduct] = useState(null);

  const handleDelete = async () => {
    try {
      await api.deleteProduct(deleteProduct.id);
      addToast('Producto eliminado', 'success');
      setDeleteProduct(null);
      reload();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const stats = products ? {
    total: products.length,
    low: products.filter(p => p.stock > 0 && p.stock <= p.stock_min).length,
    out: products.filter(p => p.stock === 0).length,
  } : null;

  return (
    <div>
      <ToastContainer />

      <div className="page-header">
        <div>
          <h2>Inventario de Productos</h2>
          <p>Control de stock en tiempo real · click en el stock para editarlo</p>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <span className="badge badge-muted">📦 {stats.total} productos</span>
          <span className="badge badge-warning">⚠️ {stats.low} bajo stock</span>
          <span className="badge badge-danger">🚨 {stats.out} sin stock</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="search-bar">
        <div className="input-group" style={{ flex: 1 }}>
          <span className="input-icon">🔍</span>
          <input
            className="input"
            placeholder="Buscar por nombre, código o proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 180 }}
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {(categories || []).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className={`btn ${showLowOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowLowOnly(v => !v)}
        >
          {showLowOnly ? '⚠️ Solo bajo stock' : '⚠️ Filtrar bajo stock'}
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Precio Venta</th>
                  <th>Unidad</th>
                  <th>Vencimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state"><div className="empty-icon">📦</div><p>No se encontraron productos</p></div>
                    </td>
                  </tr>
                ) : (
                  (products || []).map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onEdit={() => {}}
                      onDelete={setDeleteProduct}
                      onStockUpdate={reload}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteProduct && (
        <Modal
          title="Eliminar Producto"
          icon="🗑️"
          onClose={() => setDeleteProduct(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setDeleteProduct(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar definitivamente</button>
            </>
          }
        >
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ¿Estás seguro de que deseas eliminar el producto<br />
            <strong style={{ color: 'var(--text-primary)' }}>"{deleteProduct.name}"</strong>?
            <br /><br />
            Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}
