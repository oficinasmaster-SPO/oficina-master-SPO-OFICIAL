import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketManager } from '@/lib/websocketManager';
import { pollingManager } from '@/lib/pollingManager';

/**
 * Hook for WebSocket subscriptions
 * Automatically unsubscribes on unmount
 */
export function useWebSocket(channel, onMessage = null) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const ws = getWebSocketManager();

    if (!ws || !ws.isConnected) {
      setError('WebSocket not connected');
      return;
    }

    // Subscribe to channel
    unsubscribeRef.current = ws.subscribe(channel, (payload) => {
      setData(payload);
      if (onMessage) onMessage(payload);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channel, onMessage]);

  return { data, error };
}

/**
 * Hook for polling with automatic cleanup
 */
export function usePolling(key, fn, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const unsubscribe = pollingManager.startPolling(key, fn, {
      ...options,
      onData: (result) => {
        setData(result);
        if (options.onData) options.onData(result);
      },
      onChange: (result) => {
        if (options.onChange) options.onChange(result);
      },
    });

    return () => {
      unsubscribe();
      setIsPolling(false);
    };
  }, [key]);

  return { data, error, isPolling };
}

/**
 * Hook for real-time updates with automatic WS/polling fallback
 * Tries WebSocket, falls back to polling
 */
export function useRealtimeData(resource, fetchFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transportType, setTransportType] = useState(null);

  useEffect(() => {
    const ws = getWebSocketManager();

    // Try WebSocket first
    if (ws?.isConnected) {
      const unsubscribe = ws.subscribe(resource, (payload) => {
        setData(payload);
        setTransportType('websocket');
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    }

    // Fall back to polling
    setTransportType('polling');

    const unsubscribe = pollingManager.startPolling(
      `polling-${resource}`,
      fetchFn,
      {
        interval: options.pollInterval || 5000,
        onData: (result) => {
          setData(result);
          setLoading(false);
        },
        onChange: options.onChange,
      }
    );

    return unsubscribe;
  }, [resource, fetchFn]);

  return { data, loading, error, transportType };
}

/**
 * Hook for manual polling control
 */
export function useManualPolling(fn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const poll = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fn]);

  // Optionally start automatic polling
  useEffect(() => {
    if (!options.autoStart) return;

    const unsubscribe = pollingManager.startPolling(
      `manual-${Date.now()}`,
      fn,
      {
        interval: options.interval || 5000,
        onData: (result) => setData(result),
      }
    );

    return unsubscribe;
  }, [fn, options.autoStart, options.interval]);

  return { data, loading, error, poll };
}

/**
 * Hook to track WebSocket connection status
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState({
    isConnected: false,
    subscribers: 0,
    queued: 0,
  });

  useEffect(() => {
    const ws = getWebSocketManager();
    if (!ws) return;

    const updateStatus = () => {
      setStatus(ws.getStatus());
    };

    // Update on connection/disconnection
    ws.on('onConnect', updateStatus);
    ws.on('onDisconnect', updateStatus);

    // Poll status
    const interval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return status;
}