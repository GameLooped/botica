import { useState } from 'react';
import { useApi, useToast, fmt } from '../hooks.jsx';
import { api } from '../api';
import Modal from '../components/Modal';

const emptyForm = {
  code: '', name: '', category: '', description: '',
  price_buy: '', price_sell: '', stock: '', stock_min: '5',
  unit: 'unidad', expiry_date: '', supplier: '',
};

function ProductForm({ form, onChange }) {
  return (
    <div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Código</label>
          <input className="input" name="code" value={form.code} onChange={onChange} placeholder="Ej: P001" />
        </div>
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <input className="input" name="category" value={form.category} onChange={onChange} placeholder="Ej: Analgésicos" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Nombre del Producto *</label>
        <input className="input" name="name" value={form.name} onChange={onChange} placeholder="Nombre completo del medicamento" required />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="textarea" name="description" value={form.description} onChange={onChange} placeholder="Descripción, indicaciones..." rows={2} />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Precio Compra (S/)</label>
          <input className="input" type="number" name="price_buy" value={form.price_buy} onChange={onChange} placeholder="0.00" min={0} step="0.01" />
        </div>
        <div className="form-group">
          <label className="form-label">Precio Venta (S/) *</label>
          <input className="input" type="number" name="price_sell" value={form.price_sell} onChange={onChange} placeholder="0.00" min={0} step="0.01" required />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Stock Actual</label>
          <input className="input" type="number" name="stock" value={form.stock} onChange={onChange} placeholder="0" min={0} />
        </div>
        <div className="form-group">
          <label className="form-label">Stock Mínimo (alerta)</label>
          <input className="input" type="number" name="stock_min" value={form.stock_min} onChange={onChange} placeholder="5" min={0} />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Unidad</label>
          <select className="select" name="unit" value={form.unit} onChange={onChange}>
            <option value="unidad">Unidad</option>
            <option value="caja">Caja</option>
            <option value="frasco">Frasco</option>
            <option value="tubo">Tubo</option>
            <option value="sobre">Sobre</option>
            <option value="ampolla">Ampolla</option>
            <option value="blíster">Blíster</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha de Vencimiento</label>
          <input className="input" type="date" name="expiry_date" value={form.expiry_date} onChange={onChange} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Proveedor</label>
        <input className="input" name="supplier" value={form.supplier} onChange={onChange} placeholder="Nombre del laboratorio o proveedor" />
      </div>
    </div>
  );
}

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { addToast, ToastContainer } = useToast();

  const { data: products, loading, reload } = useApi(
    () => api.getProducts(search || category ? `?${new URLSearchParams({ ...(search && { search }), ...(category && { category }) })}` : ''),
    [search, category]
  );
  const { data: categories, reload: reloadCats } = useApi(() => api.getCategories(), []);

  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setModal('create');
  };

  const openEdit = (p) => {
    setForm({
      code: p.code || '',
      name: p.name,
      category: p.category || '',
      description: p.description || '',
      price_buy: p.price_buy || '',
      price_sell: p.price_sell,
      stock: p.stock,
      stock_min: p.stock_min,
      unit: p.unit || 'unidad',
      expiry_date: p.expiry_date || '',
      supplier: p.supplier || '',
    });
    setEditingProduct(p);
    setModal('edit');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.price_sell) { addToast('Nombre y precio de venta son obligatorios', 'warning'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        price_buy: Number(form.price_buy) || 0,
        price_sell: Number(form.price_sell),
        stock: Number(form.stock) || 0,
        stock_min: Number(form.stock_min) || 5,
        code: form.code || null,
        expiry_date: form.expiry_date || null,
      };

      if (modal === 'create') {
        await api.createProduct(body);
        addToast('Producto creado exitosamente', 'success');
      } else {
        await api.updateProduct(editingProduct.id, body);
        addToast('Producto actualizado', 'success');
      }
      setModal(null);
      reload();
      reloadCats();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      <ToastContainer />

      <div className="page-header">
        <div>
          <h2>Gestión de Productos</h2>
          <p>{products?.length || 0} productos registrados en el sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          ➕ Nuevo Producto
        </button>
      </div>

      {/* Filters */}
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
        <select className="select" style={{ width: 200 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {(categories || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>P. Compra</th>
                  <th>P. Venta</th>
                  <th>Stock</th>
                  <th>Stock Mín.</th>
                  <th>Vencimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(!products || products.length === 0) ? (
                  <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">🏷️</div><p>No hay productos registrados</p></div></td></tr>
                ) : (
                  products.map(p => {
                    const level = p.stock === 0 ? 'danger' : p.stock <= p.stock_min ? 'warning' : 'success';
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.code || '—'}</td>
                        <td>
                          <div style={{ fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description.substring(0, 50)}{p.description.length > 50 && '...'}</div>}
                        </td>
                        <td><span className="badge badge-muted">{p.category || '—'}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.supplier || '—'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.price_buy > 0 ? fmt.currency(p.price_buy) : '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt.currency(p.price_sell)}</td>
                        <td><span className={`badge badge-${level}`}>{p.stock} {p.unit}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.stock_min}</td>
                        <td style={{ fontSize: 12, color: p.expiry_date && new Date(p.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? 'var(--warning)' : 'var(--text-secondary)' }}>
                          {fmt.date(p.expiry_date)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteProduct(p)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
          icon={modal === 'create' ? '➕' : '✏️'}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Guardando...' : modal === 'create' ? '✅ Crear Producto' : '✅ Guardar Cambios'}
              </button>
            </>
          }
        >
          <ProductForm form={form} onChange={handleChange} />
        </Modal>
      )}

      {/* Delete Confirm */}
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
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            ¿Confirmar eliminación de<br/>
            <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>"{deleteProduct.name}"</strong>?
            <br /><br />
            Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}
