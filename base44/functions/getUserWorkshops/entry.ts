import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ✅ FUNÇÃO HELPER PARA OBTER USUÁRIO EFETIVO COM IMPERSONAÇÃO
function getEffectiveUser(rawUser) {
  try {
    const impersonationDataStr = globalThis.impersonationData;
    if (impersonationDataStr) {
      const impersonationData = JSON.parse(impersonationDataStr);
      if (impersonationData?.target_user) {
        return impersonationData.target_user;
      }
    }
  } catch (e) {
    // Fallback se houver problema ao parsear
  }
  return rawUser;
}

// Cache em memória no servidor (persiste entre requests no mesmo isolate Deno)
const workshopCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

function getCachedData(userId) {
  const entry = workshopCache.get(userId);
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) {
    return entry.data;
  }
  workshopCache.delete(userId);
  return null;
}

function setCachedData(userId, data) {
  // Limpar cache antigo se ficar grande demais (max 200 entries)
  if (workshopCache.size > 200) {
    const oldest = workshopCache.keys().next().value;
    workshopCache.delete(oldest);
  }
  workshopCache.set(userId, { data, timestamp: Date.now() });
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const authenticatedUser = await base44.auth.me();

        if (!authenticatedUser) {
            return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
        }

        const user = getEffectiveUser(authenticatedUser);
        const svc = base44.asServiceRole;
        let body = {};
        try {
            body = await req.json();
        } catch {
            // Request sem body — retornar a lista completa autorizada.
        }

        const requestedIds = Array.isArray(body?.workshopIds)
            ? [...new Set(body.workshopIds.filter(Boolean))]
            : body?.workshopId
                ? [body.workshopId]
                : [];
        const isAdmin = authenticatedUser.role === 'admin';

        // Admin mantém acesso total, inclusive para buscas explícitas.
        if (isAdmin) {
            let workshops;
            if (requestedIds.length > 0) {
                workshops = (await Promise.all(
                    requestedIds.map(id => svc.entities.Workshop.get(id).catch(() => null))
                )).filter(Boolean);
            } else {
                workshops = await svc.entities.Workshop.list('name', 500);
            }

            return Response.json({ workshops: workshops || [], user });
        }

        const cached = requestedIds.length === 0 ? getCachedData(user.id) : null;
        if (cached) {
            return new Response(JSON.stringify({ workshops: cached, user }), {
                status: 200,
                headers: new Headers({
                    'Content-Type': 'application/json',
                    'Cache-Control': 'max-age=300',
                    'X-Cache': 'HIT'
                })
            });
        }

        // Monta a autorização antes de atender qualquer ID solicitado.
        const [employeesByUser, employeesByEmail, owned, partnered] = await Promise.all([
            svc.entities.Employee.filter({ user_id: user.id }),
            user.email ? svc.entities.Employee.filter({ email: user.email }) : Promise.resolve([]),
            svc.entities.Workshop.filter({ owner_id: user.id }),
            svc.entities.Workshop.filter({ partner_ids: user.id })
        ]);

        const employeeMap = new Map();
        for (const employee of [...(employeesByUser || []), ...(employeesByEmail || [])]) {
            employeeMap.set(employee.id, employee);
        }

        const directWorkshopIds = new Set([
            user.workshop_id,
            user.data?.workshop_id,
            ...[...employeeMap.values()].map(employee => employee.workshop_id)
        ].filter(Boolean));

        const authorizedMap = new Map();
        for (const workshop of [...(owned || []), ...(partnered || [])]) {
            authorizedMap.set(workshop.id, workshop);
        }

        if (directWorkshopIds.size > 0) {
            const directWorkshops = await Promise.all(
                [...directWorkshopIds].map(id => svc.entities.Workshop.get(id).catch(() => null))
            );
            for (const workshop of directWorkshops.filter(Boolean)) {
                authorizedMap.set(workshop.id, workshop);
            }
        }

        const userType = user.user_type || user.data?.user_type;
        const jobRole = user.job_role || user.data?.job_role;
        const isInternal = userType === 'internal' || jobRole === 'consultor';
        const consultingFirmId = user.consulting_firm_id || user.data?.consulting_firm_id;

        if (isInternal && consultingFirmId) {
            const firmWorkshops = await svc.entities.Workshop.filter(
                { consulting_firm_id: consultingFirmId },
                'name',
                500
            );
            for (const workshop of (firmWorkshops || [])) {
                authorizedMap.set(workshop.id, workshop);
            }
        }

        if (requestedIds.length > 0) {
            const unauthorizedIds = requestedIds.filter(id => !authorizedMap.has(id));
            if (unauthorizedIds.length > 0) {
                return Response.json({
                    error: 'Acesso negado: uma ou mais oficinas solicitadas não pertencem ao usuário autenticado.'
                }, { status: 403 });
            }

            return Response.json({
                workshops: requestedIds.map(id => authorizedMap.get(id)),
                user
            });
        }

        const availableWorkshops = [...authorizedMap.values()];
        const preferredWorkshopId = user.workshop_id || user.data?.workshop_id;
        availableWorkshops.sort((a, b) => {
            if (preferredWorkshopId) {
                if (a.id === preferredWorkshopId && b.id !== preferredWorkshopId) return -1;
                if (b.id === preferredWorkshopId && a.id !== preferredWorkshopId) return 1;
            }
            const aInactive = a.status === 'inativo';
            const bInactive = b.status === 'inativo';
            if (aInactive !== bInactive) return aInactive ? 1 : -1;
            if (!a.company_id && b.company_id) return -1;
            if (a.company_id && !b.company_id) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        if (availableWorkshops.length > 0) {
            setCachedData(user.id, availableWorkshops);
        }

        return new Response(JSON.stringify({ workshops: availableWorkshops, user }), {
            status: 200,
            headers: new Headers({
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=300',
                'X-Cache': 'MISS'
            })
        });
    } catch (error) {
        console.error('[getUserWorkshops] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});