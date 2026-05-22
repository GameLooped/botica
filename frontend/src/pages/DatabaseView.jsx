import { useState } from 'react';
import { useApi, fmt } from '../hooks.jsx';
import { api } from '../api';

const TABS = [
  { id: 'products', label: '📦 Productos', icon: '📦' },
  { id: 'sales',    label: '🛒 Ventas',    icon: '🛒' },
  { id: 'items',    label: '📋 Ítems de Venta', icon: '📋' },
];

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="btn btn-ghost btn-sm" onClick={handleCopy} style={{ padding: '2px 8px', fontSize: 11 }}>
      {copied ? '✅' : '📋'}
    </button>
  );
}

function TableView({ data, columns }) {
  if (!data || data.length === 0) return (
    <div className="empty-state"><div className="empty-icon">🗃️</div><p>Tabla vacía</p></div>
  );
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} style={{ fontSize: 12, maxWidth: 220 }}>
                  {c.render ? c.render(row[c.key], row) : (
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row[c.key] === null || row[c.key] === undefined ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>
                      ) : String(row[c.key])}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatabaseView() {
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');

  const { data: products, loading: loadingP } = useApi(() => api.getProducts(), []);
  const { data: salesData, loading: loadingS } = useApi(() => api.getSales('?limit=200'), []);

  const sales   = salesData?.sales || [];
  const items   = sales.flatMap(s => (s.items || []).map(i => ({ ...i, sale_date: s.created_at })));

  const filter = (arr, keys) => {
    if (!search || !arr) return arr || [];
    const q = search.toLowerCase();
    return arr.filter(row => keys.some(k => String(row[k] ?? '').toLowerCase().includes(q)));
  };

  const productColumns = [
    { key: 'id',          label: 'ID' },
    { key: 'code',        label: 'Código' },
    { key: 'name',        label: 'Nombre' },
    { key: 'category',    label: 'Categoría' },
    { key: 'price_buy',   label: 'P. Compra',  render: v => fmt.currency(v) },
    { key: 'price_sell',  label: 'P. Venta',   render: v => <strong style={{ color: 'var(--accent)' }}>{fmt.currency(v)}</strong> },
    { key: 'stock',       label: 'Stock',      render: (v, r) => <span style={{ color: v === 0 ? 'var(--danger)' : v <= r.stock_min ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>{v}</span> },
    { key: 'stock_min',   label: 'Stock Mín.' },
    { key: 'unit',        label: 'Unidad' },
    { key: 'expiry_date', label: 'Vencimiento', render: v => fmt.date(v) },
    { key: 'supplier',    label: 'Proveedor' },
    { key: 'created_at',  label: 'Creado',     render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.datetime(v)}</span> },
  ];

  const saleColumns = [
    { key: 'id',             label: 'ID',     render: v => <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>#{String(v).padStart(4,'0')}</span> },
    { key: 'created_at',     label: 'Fecha',  render: v => fmt.datetime(v) },
    { key: 'customer_name',  label: 'Cliente' },
    { key: 'payment_method', label: 'Método',  render: v => <span className="badge badge-info">{v}</span> },
    { key: 'subtotal',       label: 'Subtotal', render: v => fmt.currency(v) },
    { key: 'discount',       label: 'Descuento', render: v => v > 0 ? <span style={{ color: 'var(--success)' }}>-{fmt.currency(v)}</span> : '—' },
    { key: 'total',          label: 'Total',  render: v => <strong style={{ color: 'var(--accent)' }}>{fmt.currency(v)}</strong> },
    { key: 'notes',          label: 'Notas' },
  ];

  const itemColumns = [
    { key: 'id',           label: 'ID' },
    { key: 'sale_id',      label: 'Venta #', render: v => <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>#{String(v).padStart(4,'0')}</span> },
    { key: 'product_name', label: 'Producto' },
    { key: 'quantity',     label: 'Cantidad' },
    { key: 'unit_price',   label: 'Precio Unit.', render: v => fmt.currency(v) },
    { key: 'subtotal',     label: 'Subtotal',     render: v => <strong>{fmt.currency(v)}</strong> },
    { key: 'sale_date',    label: 'Fecha Venta',  render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.datetime(v)}</span> },
  ];

  const tableData = {
    products: { data: filter(products, ['code','name','category','supplier']), cols: productColumns, loading: loadingP },
    sales:    { data: filter(sales,    ['customer_name','payment_method','notes']), cols: saleColumns, loading: loadingS },
    items:    { data: filter(items,    ['product_name']), cols: itemColumns, loading: loadingS },
  };

  const current = tableData[activeTab];

  // DB summary stats
  const dbStats = [
    { label: 'Tabla products', value: products?.length ?? '…', icon: '📦' },
    { label: 'Tabla sales',    value: sales.length,              icon: '🛒' },
    { label: 'Tabla sale_items', value: items.length,            icon: '📋' },
    { label: 'Archivo DB',     value: 'nova_salud.db',           icon: '🗄️' },
  ];

  const handleExport = () => {
    const rows = current.data;
    if (!rows || rows.length === 0) return;
    const headers = current.cols.map(c => c.key).join(',');
    const csvRows = rows.map(row =>
      current.cols.map(c => {
        const v = row[c.key];
        if (v === null || v === undefined) return '';
        const str = String(v);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_salud_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Visor de Base de Datos</h2>
          <p>
            Archivo:&nbsp;
            <code style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
              backend/nova_salud.db
            </code>
            &nbsp;· Motor: SQLite
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          📥 Exportar tabla CSV
        </button>
      </div>

      {/* DB Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {dbStats.map((s, i) => (
          <div key={i} className="kpi-card info" style={{ padding: 16 }}>
            <span className="kpi-icon" style={{ fontSize: 20 }}>{s.icon}</span>
            <div className="kpi-value" style={{ fontSize: i === 3 ? 13 : 24, color: i === 3 ? 'var(--text-secondary)' : undefined }}>{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab(t.id); setSearch(''); }}
          >
            {t.label}
            {t.id === 'products' && products && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{products.length}</span>}
            {t.id === 'sales'    && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{sales.length}</span>}
            {t.id === 'items'    && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{items.length}</span>}
          </button>
        ))}

        {/* Search filter */}
        <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
          <span className="input-icon">🔍</span>
          <input
            className="input"
            placeholder="Filtrar filas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Raw Table */}
      {current.loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            {current.data.length} filas {search && `(filtradas por "${search}")`}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <TableView data={current.data} columns={current.cols} />
          </div>
        </>
      )}

      {/* File Path Info */}
      <div className="card" style={{ marginTop: 20, padding: 16, background: 'var(--bg-elevated)' }}>
        <div className="card-title">🗄️ Información del Archivo de Base de Datos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Ruta del archivo:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 4, fontSize: 12, color: 'var(--accent)' }}>
                c:\Users\Diego\botica\backend\nova_salud.db
              </code>
              <CopyBtn value="c:\\Users\\Diego\\botica\\backend\\nova_salud.db" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Motor:</span>
            <span>SQLite 3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tablas:</span>
            <span>products · sales · sale_items</span>
          </div>
          <hr />
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            💡 Para ver la BD con un cliente gráfico avanzado, instala gratis:&nbsp;
            <a href="https://sqlitebrowser.org" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>DB Browser for SQLite</a>
            &nbsp;y abre el archivo arriba.
          </div>
        </div>
      </div>
    </div>
  );
}
