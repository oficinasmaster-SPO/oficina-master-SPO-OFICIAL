import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
        // --- SERVICE: UserWorkshopsService ---
        // Recupera todas as oficinas vinculadas ao usuário (Dono, Sócio ou Colaborador)
        // em uma única execução no servidor.
        
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
        
        // Fallback email
        if (!employees || employees.length === 0) {
            employees = await base44.entities.Employee.filter({ email: user.email });
        }

        if (employees?.length > 0) {
            const workshopIds = employees
                .map(e => e.workshop_id)
                .filter(id => id && !seenIds.has(id));
            
            // Remove duplicatas de IDs
            const uniqueWorkshopIds = [...new Set(workshopIds)];

            if (uniqueWorkshopIds.length > 0) {
                // Fetch workshops individualmente é mais seguro aqui pois filter com OR array não é padrão
                // Mas idealmente o SDK suportaria 'in'. Vamos fazer Promise.all controlado
                const employeeWorkshops = await Promise.all(
                    uniqueWorkshopIds.map(id => base44.entities.Workshop.get(id).catch(() => null))
                );

                for (const ws of employeeWorkshops) {
                    if (ws && !seenIds.has(ws.id)) {
                        availableWorkshops.push(ws);
                        seenIds.add(ws.id);
                    }
                }
            }
        }

        // Ordenar: Matrizes primeiro, depois filiais
        availableWorkshops.sort((a, b) => {
            // Se a é matriz (!company_id) e b é filial (company_id), a vem primeiro
            if (!a.company_id && b.company_id) return -1;
            if (a.company_id && !b.company_id) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Cache-Control para o Frontend (TTL 5s conforme solicitado)
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=5' 
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