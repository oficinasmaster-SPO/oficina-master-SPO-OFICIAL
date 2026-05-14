import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const withAuth = (handler) => async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
        }

        // QA-FIX-04: Apenas admin pode executar esta limpeza
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Apenas administradores.' }, { status: 403 });
        }

        return await handler(req, { base44, user });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

Deno.serve(withAuth(async (req, { base44, user }) => {
    try {
        console.log('[cleanInvalidWorkshopReferences] Iniciando limpeza de referências inválidas');
        
        // Buscar todos os workshops existentes
        const allWorkshops = await base44.asServiceRole.entities.Workshop.filter({});
        const validWorkshopIds = new Set(allWorkshops.map(w => w.id));
        
        console.log(`[cleanInvalidWorkshopReferences] ${allWorkshops.length} workshops válidos encontrados`);
        
        // Buscar todos os usuários
        const allUsers = await base44.asServiceRole.entities.User.list();
        let cleanedCount = 0;
        let errors = [];
        
        for (const usr of allUsers) {
            const userWorkshopId = usr.data?.workshop_id || usr.workshop_id;
            
            if (userWorkshopId && !validWorkshopIds.has(userWorkshopId)) {
                try {
                    // Workshop referenciado não existe mais - limpar referência
                    await base44.asServiceRole.entities.User.update(usr.id, {
                        data: {
                            ...usr.data,
                            workshop_id: null
                        }
                    });
                    
                    console.log(`[cleanInvalidWorkshopReferences] Limpado workshop inválido ${userWorkshopId} do usuário ${usr.email}`);
                    cleanedCount++;
                } catch (err) {
                    console.error(`[cleanInvalidWorkshopReferences] Erro ao limpar usuário ${usr.email}:`, err.message);
                    errors.push({ user: usr.email, error: err.message });
                }
            }
        }
        
        return Response.json({
            success: true,
            cleaned_count: cleanedCount,
            total_users: allUsers.length,
            valid_workshops: allWorkshops.length,
            errors: errors.slice(0, 10) // Mostrar apenas primeiros 10 erros
        });
        
    } catch (error) {
        console.error('[cleanInvalidWorkshopReferences] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}));