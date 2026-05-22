import { useApi, fmt } from '../hooks.jsx';
import { api } from '../api';

function Chart({ data }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="chart-container">
      <div className="chart-bars">
        {data.map((d, i) => {
          const height = Math.max((d.revenue / max) * 100, 2);
          return (
            <div key={i} className="chart-bar-wrap">
              <div className="chart-bar" style={{ height: `${height}%` }}>
                <div className="chart-bar-tooltip">{fmt.currency(d.revenue)}</div>
              </div>
              <div className="chart-label">{fmt.dayLabel(d.date)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useApi(() => api.getDashboard(), []);

  if (loading) return <div className="spinner" />;
  if (!data) return null;

  const { today, inventory, weekly_sales, recent_sales, top_products, critical_alerts } = data;

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <span className="kpi-icon">💰</span>
          <div className="kpi-value">{fmt.currency(today.total_revenue)}</div>
          <div className="kpi-label">Ventas de Hoy</div>
        </div>
        <div className="kpi-card success">
          <span className="kpi-icon">🛒</span>
          <div className="kpi-value">{today.total_sales}</div>
          <div className="kpi-label">Transacciones Hoy</div>
        </div>
        <div className="kpi-card info">
          <span className="kpi-icon">📦</span>
          <div className="kpi-value">{inventory.total_products}</div>
          <div className="kpi-label">Productos en Sistema</div>
        </div>
        <div className="kpi-card warning">
          <span className="kpi-icon">⚠️</span>
          <div className="kpi-value">{inventory.low_stock_count}</div>
          <div className="kpi-label">Productos con Bajo Stock</div>
        </div>
        <div className="kpi-card danger">
          <span className="kpi-icon">🚨</span>
          <div className="kpi-value">{inventory.out_of_stock}</div>
          <div className="kpi-label">Sin Stock</div>
        </div>
        <div className="kpi-card accent">
          <span className="kpi-icon">🎫</span>
          <div className="kpi-value">{fmt.currency(today.avg_ticket)}</div>
          <div className="kpi-label">Ticket Promedio</div>
        </div>
      </div>

      <div className="grid-21" style={{ marginBottom: 24 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-title">📈 Ventas — Últimos 7 Días</div>
          <Chart data={weekly_sales} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total semana: <strong style={{ color: 'var(--accent)' }}>{fmt.currency(weekly_sales.reduce((a, d) => a + d.revenue, 0))}</strong>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {weekly_sales.reduce((a, d) => a + d.sales_count, 0)} ventas
            </span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="card">
          <div className="card-title">🚨 Alertas Críticas</div>
          {critical_alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--success)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13 }}>Todo el inventario en nivel óptimo</div>
            </div>
          ) : (
            critical_alerts.map(p => {
              const pct = Math.round((p.stock / p.stock_min) * 100);
              const level = p.stock === 0 ? 'critical' : p.stock <= p.stock_min * 0.5 ? 'low' : 'low';
              return (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{p.name}</span>
                    <span style={{ color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)' }}>{p.stock} uds.</span>
                  </div>
                  <div className="stock-bar">
                    <div className={`stock-bar-fill ${level}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Sales */}
        <div className="card">
          <div className="card-title">🕐 Últimas Ventas</div>
          {recent_sales.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🛒</div><p>No hay ventas registradas</p></div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Ítems</th>
                    <th>Método</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_sales.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                      <td style={{ fontSize: 12 }}>{fmt.datetime(s.created_at)}</td>
                      <td>{s.item_count}</td>
                      <td>
                        <span className={`badge ${s.payment_method === 'efectivo' ? 'badge-success' : 'badge-info'}`}>
                          {s.payment_method === 'efectivo' ? '💵' : s.payment_method === 'tarjeta' ? '💳' : '📱'} {s.payment_method}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-title">🏆 Productos Más Vendidos</div>
          {top_products.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏷️</div><p>Sin datos de ventas aún</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top_products.map((p, i) => {
                const max = top_products[0].total_qty;
                const pct = (p.total_qty / max) * 100;
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>{medals[i]}</span>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.product_name}</span>
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.total_qty} vendidos</span>
                    </div>
                    <div className="stock-bar">
                      <div className="stock-bar-fill ok" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), rgba(0,201,177,0.3))' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
