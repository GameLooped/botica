export default function Modal({ title, icon, onClose, children, actions }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-title">
          {icon && <span>{icon}</span>}
          {title}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
        {actions && (
          <div className="modal-actions">{actions}</div>
        )}
      </div>
    </div>
  );
}
