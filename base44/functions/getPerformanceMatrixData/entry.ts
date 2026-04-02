import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshop_id } = await req.json().catch(() => ({}));
    if (!workshop_id) return Response.json({ error: 'workshop_id is required' }, { status: 400 });

    const cacheKey = `matrix_${workshop_id}`;
    const entry = cache.get(cacheKey);
    if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
      return Response.json(entry.data, { headers: { 'X-Cache': 'HIT' } });
    }

    const [employees, perfDiags, discDiags] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ workshop_id, status: 'ativo' }),
      base44.asServiceRole.entities.PerformanceMatrixDiagnostic.filter({ workshop_id }),
      base44.asServiceRole.entities.DISCDiagnostic.filter({ workshop_id })
    ]);

    const data = { employees, perfDiags, discDiags };

    if (cache.size > 200) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return Response.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});