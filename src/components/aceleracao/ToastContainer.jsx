import React, { createContext, useContext, useState } from 'react';
import DemandToast from './DemandToast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [queue, setQueue] = useState([]);

  const addToast = (demand) => {
    const id = Date.now() + Math.random();

    if (toasts.length < 3) {
      setToasts(prev => [...prev, { id, demand }]);
    } else {
      setQueue(prev => [...prev, { id, demand }]);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => {
      const filtered = prev.filter(t => t.id !== id);

      if (queue.length > 0 && filtered.length < 3) {
        const next = queue[0];
        setQueue(q => q.slice(1));
        return [...filtered, next];
      }

      return filtered;
    });
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-80 z-40 space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <DemandToast
              demand={toast.demand}
              onDismiss={() => removeToast(toast.id)}
              onView={() => {
                // Callback para quando user clica "Ver detalhes"
                console.log('View demand:', toast.demand);
              }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts deve ser usado dentro de ToastProvider');
  }
  return context;
}