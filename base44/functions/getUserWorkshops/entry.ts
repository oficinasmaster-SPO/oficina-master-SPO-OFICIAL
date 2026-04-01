import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cache em memória no servidor (persiste entre requests no mesmo isolate Deno)
const workshopCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

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
        // Verificar cache primeiro
        const cached = getCachedData(user.id);
        if (cached) {
            const headers = new Headers({
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=60',
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

        availableWorkshops.sort((a, b) => {
            if (!a.company_id && b.company_id) return -1;
            if (a.company_id && !b.company_id) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Salvar no cache
        setCachedData(user.id, availableWorkshops);

        const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=60',
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