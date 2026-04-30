import { useRef, useCallback } from 'react';

/**
 * P1-B02: Hook de debounce para evitar múltiplas queries
 */
export function useDebounce(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);

  return debouncedCallback;
}