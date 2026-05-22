import { useState, useCallback, useEffect } from 'react';

// ─── Toast Hook ────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const ToastContainer = () => (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{icons[t.type]}</span> {t.message}
        </div>
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}

// ─── useApi Hook ───────────────────────────────────────────────────────────
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Format helpers ────────────────────────────────────────────────────────
export const fmt = {
  currency: (n) => `S/ ${Number(n || 0).toFixed(2)}`,
  date: (s) => s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
  datetime: (s) => s ? new Date(s).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—',
  dayLabel: (dateStr) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
  },
};
