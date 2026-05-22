// Centralized API helper
const BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const api = {
  // Products
  getProducts:   (params = '') => request(`/products${params}`),
  getProduct:    (id)          => request(`/products/${id}`),
  getCategories: ()            => request('/products/meta/categories'),
  createProduct: (body)        => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body)    => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateStock:   (id, stock)   => request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ stock }) }),
  deleteProduct: (id)          => request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales:      (params = '') => request(`/sales${params}`),
  getSale:       (id)          => request(`/sales/${id}`),
  createSale:    (body)        => request('/sales', { method: 'POST', body: JSON.stringify(body) }),
  getTodayStats: ()            => request('/sales/stats/today'),

  // Alerts
  getAlerts:     ()            => request('/alerts'),
  getAlertCount: ()            => request('/alerts/count'),
  getExpiryAlerts: ()          => request('/alerts/expiry'),
  updateThreshold: (id, stock_min) => request(`/alerts/${id}/threshold`, { method: 'PATCH', body: JSON.stringify({ stock_min }) }),

  // Dashboard
  getDashboard:  ()            => request('/dashboard'),
};
