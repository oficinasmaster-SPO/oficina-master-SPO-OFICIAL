import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshop_id } = await req.json().catch(() => ({}));
    const cacheKey = `attendance_${workshop_id || 'global'}`;

    const entry = cache.get(cacheKey);
    if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
      return Response.json({ types: entry.data }, { headers: { 'X-Cache': 'HIT' } });
    }

    const globalTypes = await base44.asServiceRole.entities.TipoAtendimentoConsultoria.filter({
      workshop_id: null,
      ativo: true
    }, '-updated_date', 100);

    let customTypes = [];
    if (workshop_id) {
      customTypes = await base44.asServiceRole.entities.TipoAtendimentoConsultoria.filter({
        workshop_id: workshop_id,
        ativo: true
      }, '-updated_date', 100);
    }

    const merged = [
      ...customTypes,
      ...globalTypes.filter(g => !customTypes.some(c => c.value === g.value))
    ];

    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { data: merged, timestamp: Date.now() });

    return Response.json({ types: merged }, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});