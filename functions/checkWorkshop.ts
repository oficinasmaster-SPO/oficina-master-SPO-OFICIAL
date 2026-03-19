import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Autenticar usuário
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json().catch(() => ({}));
        let workshopId = payload.workshop_id;

        // Se não forneceu ID, tentar encontrar via Employee
        if (!workshopId) {
            let employees = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
            if (!employees || employees.length === 0) {
                employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
            }
            if (employees && employees.length > 0) {
                workshopId = employees[0].workshop_id;
            }
        }

        if (!workshopId) {
            return Response.json({ 
                workshopFound: false,
                workshopData: null,
                message: "Nenhuma oficina vinculada encontrada para este usuário."
            });
        }
        
        // Buscar Workshop ignorando RLS
        let workshop = null;
        try {
            workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
        } catch (e) {
            // Ignora erro se não encontrar
        }

        // Atualizar user.data.workshop_id se estiver faltando ou diferente, para facilitar futuras requisições no front
        if (workshop && (!user.data?.workshop_id || user.data.workshop_id !== workshop.id)) {
            try {
                await base44.auth.updateMe({ workshop_id: workshop.id });
            } catch (e) {
                console.warn("Erro ao atualizar user.data.workshop_id:", e);
            }
        }

        return Response.json({ 
            workshopFound: !!workshop,
            workshopData: workshop
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});