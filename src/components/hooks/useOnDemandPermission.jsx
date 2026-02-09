import { useState, useCallback, useRef } from 'react';
import { usePermissions } from './usePermissions';

/**
 * Hook para validação de permissão on-demand (só quando necessário)
 * Com cache para evitar validações repetidas
 */
export function useOnDemandPermission() {
  const { hasGranularPermission, loading: permissionsLoading } = usePermissions();
  const [checking, setChecking] = useState(false);
  const cache = useRef(new Map());

  const checkPermission = useCallback(async (resource, action, options = {}) => {
    const { skipCache = false, onDenied = null } = options;
    const cacheKey = `${resource}:${action}`;

    // Verificar cache
    if (!skipCache && cache.current.has(cacheKey)) {
      const cached = cache.current.get(cacheKey);
      if (!cached) {
        onDenied?.();
      }
      return cached;
    }

    setChecking(true);
    try {
      const allowed = await hasGranularPermission(resource, action);
      
      // Guardar no cache
      cache.current.set(cacheKey, allowed);

      if (!allowed && onDenied) {
        onDenied();
      }

      return allowed;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    } finally {
      setChecking(false);
    }
  }, [hasGranularPermission]);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return {
    checkPermission,
    checking: checking || permissionsLoading,
    clearCache
  };
}