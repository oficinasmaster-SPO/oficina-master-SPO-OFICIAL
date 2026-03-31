import { useEffect, useRef } from 'react';
import { RequestCache, createQueryTracker } from '@/lib/queryOptimizer';

/**
 * Hook que otimiza queries automaticamente
 * - Cache local por requisição
 * - Detecta duplicatas em dev
 * - Avisa sobre N+1 patterns
 */
export function useQueryOptimizer(pageName = 'Unknown') {
  const cacheRef = useRef(new RequestCache());
  const trackerRef = useRef(createQueryTracker());

  useEffect(() => {
    return () => {
      // Limp ar cache ao desmontar
      cacheRef.current.clear();
      
      // Report N+1 em dev
      if (import.meta.env.DEV) {
        const duplicates = trackerRef.current.getReport();
        if (duplicates.length > 0) {
          console.warn(`📊 [${pageName}] N+1 Queries Detected:`, duplicates);
        }
      }
      
      trackerRef.current.clear();
    };
  }, [pageName]);

  return {
    cache: cacheRef.current,
    tracker: trackerRef.current,
  };
}

/**
 * Hook para batch fetching com auto-dedup
 */
export function useBatchFetch(fetcher) {
  const pendingRef = useRef(new Map());
  const cacheRef = useRef(new Map());

  const fetchBatch = async (ids) => {
    const uncached = ids.filter(id => !cacheRef.current.has(id));
    
    if (uncached.length === 0) {
      return ids.map(id => cacheRef.current.get(id));
    }

    // Aguarda fetch anterior se existir
    const cacheKey = JSON.stringify(uncached.sort());
    if (pendingRef.current.has(cacheKey)) {
      await pendingRef.current.get(cacheKey);
    } else {
      const promise = fetcher(uncached).then(results => {
        uncached.forEach((id, i) => {
          cacheRef.current.set(id, results[i]);
        });
        pendingRef.current.delete(cacheKey);
      });
      pendingRef.current.set(cacheKey, promise);
      await promise;
    }

    return ids.map(id => cacheRef.current.get(id));
  };

  return { fetchBatch };
}