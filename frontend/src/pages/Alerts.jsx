import { useState } from 'react';
import { useApi, useToast, fmt } from '../hooks.jsx';
import { api } from '../api';
import Modal from '../components/Modal';

function SeverityIcon({ severity }) {
  if (severity === 'critico') return <span title="Crítico — Sin stock">🚨</span>;
  if (severity === 'alto')    return <span title="Alto — Muy bajo stock">⚠️</span>;
  return                             <span title="Medio — Stock bajo">🔔</span>;
}

function AlertCard({ alert, onThresholdUpdate }) {
  const [editingMin, setEditingMin] = useState(false);
  const [tempMin, setTempMin] = useState(alert.stock_min);
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      await api.updateThreshold(alert.id, Number(tempMin));
      onThresholdUpdate();
      setEditingMin(false);
      addToast('Umbral actualizado', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className={`alert-item ${alert.severity}`}>
      <div className="alert-icon"><SeverityIcon severity={alert.severity} /></div>
      <div className="alert-body">
        <div className="alert-name">{alert.name}</div>
        <div className="alert-meta">
          {alert.category && <span className="badge badge-muted" style={{ marginRight: 6 }}>{alert.category}</span>}
          Mín.:
          {editingMin ? (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
              <input
                type="number"
                className="input"
                style={{ width: 60, padding: '2px 6px', fontSize: 12, display: 'inline' }}
                value={tempMin}
                min={0}
                onChange={e => setTempMin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px' }} onClick={handleSave}>✓</button>
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => { setTempMin(alert.stock_min); setEditingMin(false); }}>✕</button>
            </span>
          ) : (
            <span
              style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: 4, cursor: 'pointer', textDecoration: 'underline dotted' }}
              onClick={() => setEditingMin(true)}
              title="Click para editar umbral mínimo"
            >
              {alert.stock_min} uds.
            </span>
          )}
          {alert.supplier && <span style={{ marginLeft: 8 }}>· {alert.supplier}</span>}
        </div>
      </div>
      <div>
        <div className="alert-stock">{alert.stock}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>en stock</div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{fmt.currency(alert.price_sell)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.unit}</div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { addToast, ToastContainer } = useToast();
  const { data: alerts, loading: loadingAlerts, reload: reloadAlerts } = useApi(() => api.getAlerts(), []);
  const { data: expiryAlerts, loading: loadingExpiry } = useApi(() => api.getExpiryAlerts(), []);
  const [activeTab, setActiveTab] = useState('stock');

  const critical = (alerts || []).filter(a => a.severity === 'critico');
  const high = (alerts || []).filter(a => a.severity === 'alto');
  const medium = (alerts || []).filter(a => a.severity === 'medio');

  const handleExport = () => {
    if (!alerts || alerts.length === 0) return;
    const header = 'Código,Producto,Categoría,Stock Actual,Stock Mínimo,Precio Venta,Proveedor';
    const rows = alerts.map(a =>
      `${a.code || ''},${a.name},"${a.category || ''}",${a.stock},${a.stock_min},${a.price_sell},"${a.supplier || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reposicion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Lista de reposición exportada', 'success');
  };

  return (
    <div>
      <ToastContainer />

      <div className="page-header">
        <div>
          <h2>Centro de Alertas</h2>
          <p>Productos que requieren reposición · Umbral editable por producto</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={reloadAlerts}>🔄 Actualizar</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={!alerts || alerts.length === 0}>
            📥 Exportar Lista de Reposición
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {alerts && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="kpi-card danger" style={{ flex: 1, minWidth: 140, padding: 16 }}>
            <span className="kpi-icon" style={{ fontSize: 22 }}>🚨</span>
            <div className="kpi-value" style={{ fontSize: 22 }}>{critical.length}</div>
            <div className="kpi-label">Sin stock</div>
          </div>
          <div className="kpi-card warning" style={{ flex: 1, minWidth: 140, padding: 16 }}>
            <span className="kpi-icon" style={{ fontSize: 22 }}>⚠️</span>
            <div className="kpi-value" style={{ fontSize: 22 }}>{high.length}</div>
            <div className="kpi-label">Stock muy bajo</div>
          </div>
          <div className="kpi-card info" style={{ flex: 1, minWidth: 140, padding: 16 }}>
            <span className="kpi-icon" style={{ fontSize: 22 }}>🔔</span>
            <div className="kpi-value" style={{ fontSize: 22 }}>{medium.length}</div>
            <div className="kpi-label">Stock bajo</div>
          </div>
          <div className="kpi-card accent" style={{ flex: 1, minWidth: 140, padding: 16 }}>
            <span className="kpi-icon" style={{ fontSize: 22 }}>📅</span>
            <div className="kpi-value" style={{ fontSize: 22 }}>{expiryAlerts?.length || 0}</div>
            <div className="kpi-label">Por vencer (90 días)</div>
          </div>
        </div>
      )}

      {/* Tab Switch */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('stock')}>
          🔔 Alertas de Stock ({(alerts || []).length})
        </button>
        <button className={`btn ${activeTab === 'expiry' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('expiry')}>
          📅 Por Vencer ({expiryAlerts?.length || 0})
        </button>
      </div>

      {activeTab === 'stock' && (
        <>
          {loadingAlerts ? <div className="spinner" /> : (
            <>
              {(alerts || []).length === 0 ? (
                <div className="card">
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--success)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>¡Todo el inventario en nivel óptimo!</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>No hay productos que requieran reposición en este momento.</div>
                  </div>
                </div>
              ) : (
                <>
                  {critical.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🚨 Crítico — Sin Stock ({critical.length})
                      </div>
                      {critical.map(a => <AlertCard key={a.id} alert={a} onThresholdUpdate={reloadAlerts} />)}
                    </>
                  )}
                  {high.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ⚠️ Muy Bajo Stock ({high.length})
                      </div>
                      {high.map(a => <AlertCard key={a.id} alert={a} onThresholdUpdate={reloadAlerts} />)}
                    </>
                  )}
                  {medium.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🔔 Stock Bajo ({medium.length})
                      </div>
                      {medium.map(a => <AlertCard key={a.id} alert={a} onThresholdUpdate={reloadAlerts} />)}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'expiry' && (
        <>
          {loadingExpiry ? <div className="spinner" /> : (
            <>
              {(!expiryAlerts || expiryAlerts.length === 0) ? (
                <div className="card">
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--success)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>No hay productos próximos a vencer</div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Stock</th>
                          <th>Vencimiento</th>
                          <th>Días Restantes</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiryAlerts.map(p => (
                          <tr key={p.id}>
                            <td><div style={{ fontWeight: 600 }}>{p.name}</div></td>
                            <td><span className="badge badge-muted">{p.category || '—'}</span></td>
                            <td>{p.stock}</td>
                            <td>{fmt.date(p.expiry_date)}</td>
                            <td>
                              <strong style={{ color: p.days_left <= 30 ? 'var(--danger)' : p.days_left <= 60 ? 'var(--warning)' : 'var(--info)' }}>
                                {p.days_left} días
                              </strong>
                            </td>
                            <td>
                              <span className={`badge ${p.days_left <= 30 ? 'badge-danger' : p.days_left <= 60 ? 'badge-warning' : 'badge-info'}`}>
                                {p.days_left <= 30 ? '🚨 Urgente' : p.days_left <= 60 ? '⚠️ Próximo' : '🔔 Vigilar'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
