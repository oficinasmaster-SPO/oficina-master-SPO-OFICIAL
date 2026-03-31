// Query Optimization Utilities
// Detecta N+1, batch fetches, e otimiza queries

/**
 * Batch fetch com memoização — evita múltiplas queries do mesmo tipo
 * Ex: Em vez de buscar dados de cada colaborador individualmente
 */
export async function batchFetch(ids, fetchFn, batchSize = 50) {
  if (!ids || ids.length === 0) return [];
  
  const batches = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }
  
  const results = await Promise.all(
    batches.map(batch => fetchFn(batch))
  );
  
  return results.flat();
}

/**
 * Query cache local por requisição — evita re-fetches dentro da mesma renderização
 */
export class RequestCache {
  constructor() {
    this.cache = new Map();
  }

  async get(key, fetchFn) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const result = await fetchFn();
    this.cache.set(key, result);
    return result;
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Normalizar dados relacionados — evita duplicação em cache
 * Ex: Armazenar reference ao Workshop em vez de copiar todo o objeto
 */
export function normalizeRelations(data, relations = {}) {
  const normalized = { ...data };
  
  for (const [field, relationType] of Object.entries(relations)) {
    if (normalized[field]) {
      // Manter apenas ID + campo de display
      normalized[field] = {
        id: normalized[field].id,
        [relationType.displayField]: normalized[field][relationType.displayField],
      };
    }
  }
  
  return normalized;
}

/**
 * Detector de queries duplicadas — log em dev
 */
export function createQueryTracker() {
  const queries = new Map();

  return {
    track: (key, fn) => {
      if (!queries.has(key)) {
        queries.set(key, 0);
      }
      queries.set(key, queries.get(key) + 1);
      
      if (import.meta.env.DEV && queries.get(key) > 1) {
        console.warn(`⚠️ Duplicate query detected: ${key} (${queries.get(key)}x)`);
      }
      
      return fn();
    },
    getReport: () => {
      return Array.from(queries.entries())
        .filter(([, count]) => count > 1)
        .map(([key, count]) => ({ key, count }));
    },
    clear: () => queries.clear(),
  };
}