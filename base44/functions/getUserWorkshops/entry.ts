import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

const withAuth = (handler) => async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
        }

        return await handler(req, { base44, user });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

Deno.serve(withAuth(async (req, { base44, user }) => {
    try {
        // GAP-01: Se workshopId específico foi solicitado, buscar diretamente com asServiceRole
        let body = {};
        try {
            body = await req.json();
        } catch {
            // Request sem body — continuar com lista completa
        }

        if (body?.workshopId) {
            const ws = await base44.asServiceRole.entities.Workshop.get(body.workshopId).catch(() => null);
            return new Response(JSON.stringify({ 
                workshops: ws ? [ws] : [],
                user: user 
            }), { status: 200 });
        }

        // Verificar cache primeiro
        const cached = getCachedData(user.id);
        if (cached) {
            const headers = new Headers({
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=300',
                'X-Cache': 'HIT'
            });
            return new Response(JSON.stringify({ 
                workshops: cached,
                user: user 
            }), { status: 200, headers });
        }

        // --- SERVICE: UserWorkshopsService ---
        let availableWorkshops = [];
        const seenIds = new Set();

        // FIX-01: Adicionar workshop do perfil como fallback se nenhum for encontrado
        const userProfileWorkshopId = user.data?.workshop_id || user.workshop_id;

        const [owned, partnered] = await Promise.all([
            base44.entities.Workshop.filter({ owner_id: user.id }),
            base44.entities.Workshop.filter({ partner_ids: user.id })
        ]);

        if (owned?.length > 0) {
            for (const ws of owned) {
                if (!seenIds.has(ws.id)) {
                    availableWorkshops.push(ws);
                    seenIds.add(ws.id);
                }
            }
        }

        if (partnered?.length > 0) {
            for (const ws of partnered) {
                if (!seenIds.has(ws.id)) {
                    availableWorkshops.push(ws);
                    seenIds.add(ws.id);
                }
            }
        }

        let employees = await base44.entities.Employee.filter({ user_id: user.id });
        
        if (!employees || employees.length === 0) {
            employees = await base44.entities.Employee.filter({ email: user.email });
        }

        if (employees?.length > 0) {
            const workshopIds = employees
                .map(e => e.workshop_id)
                .filter(id => id && !seenIds.has(id));
            
            const uniqueWorkshopIds = [...new Set(workshopIds)];

            if (uniqueWorkshopIds.length > 0) {
                const employeeWorkshops = await Promise.all(
                    uniqueWorkshopIds.map(id => base44.asServiceRole.entities.Workshop.get(id).catch(() => null))
                );

                for (const ws of employeeWorkshops) {
                    if (ws && !seenIds.has(ws.id)) {
                        availableWorkshops.push(ws);
                        seenIds.add(ws.id);
                    }
                }
            }
        }

        // FIX-01: Fallback final — se nenhum workshop foi encontrado mas o usuário tem um no perfil, buscar diretamente
        if (availableWorkshops.length === 0 && userProfileWorkshopId && !seenIds.has(userProfileWorkshopId)) {
            try {
                const profileWorkshop = await base44.asServiceRole.entities.Workshop.get(userProfileWorkshopId).catch(() => null);
                if (profileWorkshop) {
                    availableWorkshops.push(profileWorkshop);
                    seenIds.add(profileWorkshop.id);
                    console.warn(`FIX-01: Adicionado workshop do perfil ${userProfileWorkshopId} como fallback`);
                }
            } catch (e) {
                console.warn(`FIX-01: Falha ao buscar workshop do perfil:`, e.message);
            }
        }

        availableWorkshops.sort((a, b) => {
            if (!a.company_id && b.company_id) return -1;
            if (a.company_id && !b.company_id) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        // FIX-06: Debug logging
        if (availableWorkshops.length === 0) {
            console.warn(`FIX-06: getUserWorkshops retornou vazio para user ${user.id} (${user.email})`);
        }

        // Salvar no cache
        setCachedData(user.id, availableWorkshops);

        const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300',
            'X-Cache': 'MISS'
        });

        return new Response(JSON.stringify({ 
            workshops: availableWorkshops,
            user: user 
        }), { status: 200, headers });

    } catch (error) {
        console.error("BFF Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}));