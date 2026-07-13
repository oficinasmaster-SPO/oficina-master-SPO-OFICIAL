import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshop_id } = await req.json().catch(() => ({}));

    // Validação de tenant (auditoria): workshop_id do payload só é aceito se o
    // usuário tiver vínculo — membership ativa, campo raiz/legado, admin ou internal.
    if (workshop_id) {
      const isAdmin = user.role === 'admin';
      const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
      let autorizado = isAdmin || isInternal ||
        user.workshop_id === workshop_id || user.data?.workshop_id === workshop_id;
      if (!autorizado) {
        try {
          const ms = await base44.asServiceRole.entities.TenantMembership.filter({
            user_id: user.id, workshop_id, status: 'active'
          });
          autorizado = ms && ms.length > 0;
        } catch (_) { /* membership indisponível — mantém não autorizado */ }
      }
      if (!autorizado) {
        return Response.json({ error: 'Acesso negado: sem vínculo com a oficina informada.' }, { status: 403 });
      }
    }

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