import { useState, useRef } from 'react';
import { useApi, useToast, fmt } from '../hooks.jsx';
import { api } from '../api';
import Modal from '../components/Modal';

export default function Sales() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [payMethod, setPayMethod] = useState('efectivo');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  const { addToast, ToastContainer } = useToast();
  const searchRef = useRef();

  // Products list
  const { data: products, reload: reloadProducts } = useApi(
    () => api.getProducts(search ? `?search=${encodeURIComponent(search)}` : ''),
    [search]
  );

  // Sales history
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: salesData, loading: loadingHistory, reload: reloadHistory } = useApi(
    () => {
      let q = '?limit=30&offset=0';
      if (dateFrom) q += `&date_from=${dateFrom}`;
      if (dateTo) q += `&date_to=${dateTo}`;
      return api.getSales(q);
    },
    [dateFrom, dateTo, activeTab]
  );

  // Cart operations
  const addToCart = (product) => {
    if (product.stock === 0) { addToast('Sin stock disponible', 'warning'); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { addToast('Cantidad máxima alcanzada', 'warning'); return prev; }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price_sell,
        quantity: 1,
        max_stock: product.stock,
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: Math.min(i.quantity + delta, i.max_stock) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { addToast('El carrito está vacío', 'warning'); return; }
    setSubmitting(true);
    try {
      const sale = await api.createSale({
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
        payment_method: payMethod,
        customer_name: customerName || null,
        discount: Number(discount) || 0,
      });
      setReceipt({ ...sale, items: cart, subtotal, discount: Number(discount) || 0, total });
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      reloadProducts();
      addToast('Venta registrada exitosamente ✅', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => { window.print(); };

  return (
    <div>
      <ToastContainer />

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pos')}
        >🛒 Punto de Venta</button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >📋 Historial de Ventas</button>
      </div>

      {/* POS */}
      {activeTab === 'pos' && (
        <div className="pos-layout">
          {/* Left: Product search + grid */}
          <div className="pos-products">
            <div className="input-group" style={{ marginBottom: 14 }}>
              <span className="input-icon">🔍</span>
              <input
                ref={searchRef}
                className="input"
                placeholder="Buscar medicamento por nombre o código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {!products || products.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💊</div><p>No se encontraron productos</p></div>
            ) : (
              <div className="product-grid">
                {products.map(p => (
                  <div
                    key={p.id}
                    className={`product-card-small ${p.stock === 0 ? 'out-of-stock' : ''}`}
                    onClick={() => addToCart(p)}
                    title={p.stock === 0 ? 'Sin stock' : `Agregar al carrito`}
                  >
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'monospace' }}>{p.code}</div>
                    <div className="product-card-name">{p.name}</div>
                    <div className="product-card-price">{fmt.currency(p.price_sell)}</div>
                    <div className="product-card-stock">
                      {p.stock === 0 ? '❌ Sin stock' : `✅ ${p.stock} ${p.unit}s`}
                    </div>
                    {p.stock > 0 && p.stock <= p.stock_min && (
                      <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 3 }}>⚠️ Bajo stock</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Cart */}
          <div className="pos-cart">
            <div className="pos-cart-header">
              🛒 Carrito
              {cart.length > 0 && (
                <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>{cart.reduce((s, i) => s + i.quantity, 0)} ítems</span>
              )}
            </div>

            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div className="empty-icon">🛒</div>
                  <p>Selecciona productos del catálogo</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="cart-item">
                    <div className="cart-item-name">{item.product_name}</div>
                    <div className="cart-item-controls">
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, +1)}>+</button>
                      <button className="qty-btn" style={{ color: 'var(--danger)' }} onClick={() => removeFromCart(item.product_id)}>🗑</button>
                    </div>
                    <div className="cart-item-price">{fmt.currency(item.unit_price * item.quantity)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pos-cart-footer">
              {/* Customer & Discount */}
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Cliente (opcional)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Descuento S/"
                    value={discount}
                    min={0}
                    onChange={e => setDiscount(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: 13 }}
                  />
                  <select
                    className="select"
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: 13 }}
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="transferencia">📱 Transferencia</option>
                    <option value="yape">📲 Yape/Plin</option>
                  </select>
                </div>
              </div>

              {/* Totals */}
              <div className="pos-totals">
                <div className="pos-total-row"><span>Subtotal</span><span>{fmt.currency(subtotal)}</span></div>
                {discount > 0 && <div className="pos-total-row" style={{ color: 'var(--success)' }}><span>Descuento</span><span>-{fmt.currency(discount)}</span></div>}
                <div className="pos-total-row grand"><span>TOTAL</span><span>{fmt.currency(total)}</span></div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: 14, fontSize: 15 }}
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
              >
                {submitting ? '⏳ Procesando...' : `✅ Confirmar Venta — ${fmt.currency(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div>
          <div className="search-bar">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Desde</span>
              <input type="date" className="input" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hasta</span>
              <input type="date" className="input" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={reloadHistory}>🔄 Actualizar</button>
            {salesData && (
              <span className="badge badge-muted">{salesData.total} ventas encontradas</span>
            )}
          </div>

          {loadingHistory ? <div className="spinner" /> : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#Venta</th>
                      <th>Fecha y Hora</th>
                      <th>Cliente</th>
                      <th>Método Pago</th>
                      <th>Descuento</th>
                      <th>Total</th>
                      <th>Productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!salesData?.sales || salesData.sales.length === 0) ? (
                      <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🛒</div><p>No hay ventas en este período</p></div></td></tr>
                    ) : (
                      salesData.sales.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>#{String(s.id).padStart(4, '0')}</td>
                          <td style={{ fontSize: 12 }}>{fmt.datetime(s.created_at)}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{s.customer_name || '—'}</td>
                          <td>
                            <span className={`badge ${s.payment_method === 'efectivo' ? 'badge-success' : s.payment_method === 'tarjeta' ? 'badge-info' : 'badge-accent'}`}>
                              {s.payment_method}
                            </span>
                          </td>
                          <td style={{ color: 'var(--success)' }}>{s.discount > 0 ? `-${fmt.currency(s.discount)}` : '—'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(s.total)}</td>
                          <td>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 280 }}>
                              {s.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <Modal
          title="Venta Registrada"
          icon="🧾"
          onClose={() => setReceipt(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={handlePrint}>🖨️ Imprimir</button>
              <button className="btn btn-primary" onClick={() => setReceipt(null)}>✅ Nueva Venta</button>
            </>
          }
        >
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>Venta exitosa</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>Detalle de la venta #{receipt.id}</div>
            {receipt.items.map(i => (
              <div key={i.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{i.product_name} × {i.quantity}</span>
                <span style={{ fontWeight: 600 }}>{fmt.currency(i.unit_price * i.quantity)}</span>
              </div>
            ))}
            <hr />
            {receipt.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontSize: 13, marginBottom: 4 }}>
                <span>Descuento</span><span>-{fmt.currency(receipt.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
              <span>TOTAL</span><span>{fmt.currency(receipt.total)}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            Pago: <strong style={{ color: 'var(--text-primary)' }}>{receipt.payment_method}</strong>
            {receipt.customer_name && <> · Cliente: <strong style={{ color: 'var(--text-primary)' }}>{receipt.customer_name}</strong></>}
          </div>
        </Modal>
      )}
    </div>
  );
}
