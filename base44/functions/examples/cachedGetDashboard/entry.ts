// Example: Backend caching pattern for expensive dashboard queries
// Apply to: bffDashboard, calculateRankings, generateReports

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// In-memory cache inline (functions não podem importar arquivos fora do próprio diretório)
const _cache = new Map();
async function getOrSet(key, fn, ttl = 1000 * 60 * 5) {
  if (_cache.has(key)) return _cache.get(key);
  const result = await fn();
  _cache.set(key, result);
  setTimeout(() => _cache.delete(key), ttl);
  return result;
}
function invalidateCache(keyPattern) {
  if (typeof keyPattern === 'string') _cache.delete(keyPattern);
  else if (keyPattern instanceof RegExp) for (const k of _cache.keys()) if (keyPattern.test(k)) _cache.delete(k);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache key: includes user + workshop scope
    const cacheKey = `dashboard:${user.id}:${user.data.workshop_id}`;
    
    // Fetch with caching (5-minute TTL)
    const dashboard = await getOrSet(cacheKey, async () => {
      // Expensive operations here
      const workshops = await base44.entities.Workshop.filter(
        { id: user.data.workshop_id },
        '-updated_date',
        1
      );
      
      const employees = await base44.entities.Employee.filter(
        { workshop_id: user.data.workshop_id },
        '-updated_date',
        100
      );
      
      return {
        workshops: workshops || [],
        employees: employees || [],
        timestamp: new Date().toISOString(),
      };
    }, 1000 * 60 * 5); // 5 minutes cache

    return Response.json(dashboard);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});