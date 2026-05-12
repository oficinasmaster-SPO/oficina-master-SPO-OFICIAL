import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar fila de toasts com timing inteligente
 * - Máximo 3 toasts simultâneos
 * - Fila automática esperando dismiss
 * - Timing: 1 toast a cada ~5 segundos
 */
export function useToastQueue() {
  const [visibleToasts, setVisibleToasts] = useState([]);
  const [queuedToasts, setQueuedToasts] = useState([]);

  // Adicionar toast à fila
  const addToast = useCallback((demand) => {
    const id = Date.now() + Math.random();
    const toast = { id, demand, addedAt: Date.now() };

    if (visibleToasts.length < 3) {
      // Se há espaço, mostrar imediatamente
      setVisibleToasts(prev => [...prev, toast]);
    } else {
      // Senão, enfileirar
      setQueuedToasts(prev => [...prev, toast]);
    }

    return id;
  }, [visibleToasts.length]);

  // Remover toast
  const removeToast = useCallback((toastId) => {
    setVisibleToasts(prev => {
      const filtered = prev.filter(t => t.id !== toastId);

      // Se há enfileirados, mostrar o próximo
      if (queuedToasts.length > 0 && filtered.length < 3) {
        const nextToast = queuedToasts[0];
        setQueuedToasts(prev => prev.slice(1));
        return [...filtered, nextToast];
      }

      return filtered;
    });
  }, [queuedToasts]);

  // Limpar tudo
  const clearAll = useCallback(() => {
    setVisibleToasts([]);
    setQueuedToasts([]);
  }, []);

  return {
    visibleToasts,
    queuedToasts,
    addToast,
    removeToast,
    clearAll
  };
}

/**
 * Hook para disparar toasts baseado em demands com timing inteligente
 */
export function useSmartToastDispatcher(demands, addToast, onAlertShown) {
  useEffect(() => {
    if (!demands) return;

    // Agregar todas as demands críticas
    const allCritical = [
      ...(demands.sprints || [])
        .filter(s => s.severity === 'RED')
        .map(s => ({ ...s, demandType: 'sprint' })),
      ...(demands.pedidosInternos || [])
        .filter(p => p.severity === 'RED')
        .map(p => ({ ...p, demandType: 'pedido' })),
      ...(demands.backlogTarefas || [])
        .filter(t => t.severity === 'RED')
        .map(t => ({ ...t, demandType: 'tarefa' })),
      ...(demands.cronogramaItems || [])
        .filter(c => c.severity === 'RED')
        .map(c => ({ ...c, demandType: 'cronograma' }))
    ];

    if (allCritical.length === 0) return;

    // Disparar toasts com timing escalonado
    const timers = allCritical.map((demand, index) => {
      const delay = index * 5000; // 5 segundos entre toasts
      return setTimeout(() => {
        addToast(demand);
        onAlertShown?.(demand);
      }, delay);
    });

    return () => timers.forEach(clearTimeout);
  }, [demands, addToast, onAlertShown]);
}