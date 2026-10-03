import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from '../../utils/icons.jsx';
import './Toast.css';

const ToastContext = createContext(null);

const ICONS = { success: 'check', error: 'x', info: 'info' };

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, msg) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, type, msg }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <span className="toast-icon">
              <Icon name={ICONS[t.type]} size={16} />
            </span>
            <span className="toast-msg">{t.msg}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
