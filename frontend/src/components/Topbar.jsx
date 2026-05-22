import { useState, useEffect } from 'react';

const titles = {
  dashboard: { icon: '📊', label: 'Dashboard', sub: 'Resumen general del negocio' },
  inventory: { icon: '📦', label: 'Inventario', sub: 'Control de stock en tiempo real' },
  sales:     { icon: '🛒', label: 'Ventas / POS', sub: 'Punto de venta y atención al cliente' },
  alerts:    { icon: '🔔', label: 'Alertas de Stock', sub: 'Productos que necesitan reposición' },
  products:  { icon: '🏷️', label: 'Gestión de Productos', sub: 'Catálogo y datos de productos' },
  database:  { icon: '🗄️', label: 'Base de Datos', sub: 'Visor de tablas SQLite · nova_salud.db' },
};

export default function Topbar({ page }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const info = titles[page] || titles.dashboard;

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">
          <span>{info.icon}</span> {info.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{info.sub}</div>
      </div>
      <div className="topbar-right">
        <div className="topbar-time">🕐 {time}</div>
        <div className="topbar-badge">🏥 Botica Nova Salud</div>
      </div>
    </header>
  );
}
