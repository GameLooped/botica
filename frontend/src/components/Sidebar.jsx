import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Sidebar({ active, onNavigate }) {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { count } = await api.getAlertCount();
        setAlertCount(count);
      } catch { /* silent */ }
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard',  icon: '📊', label: 'Dashboard' },
    { id: 'inventory',  icon: '📦', label: 'Inventario' },
    { id: 'sales',      icon: '🛒', label: 'Ventas / POS' },
    { id: 'alerts',     icon: '🔔', label: 'Alertas de Stock', badge: alertCount },
    { id: 'products',   icon: '🏷️', label: 'Productos' },
    { id: 'database',   icon: '🗄️', label: 'Base de Datos' },
  ];

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">💊</div>
        <div>
          <h1>Nova Salud</h1>
          <span>Sistema de Gestión</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Menú Principal</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 4, textTransform: 'capitalize' }}>{dateStr}</div>
        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>v1.0.0</div>
      </div>
    </aside>
  );
}
