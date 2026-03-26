import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const withAuthAndTenant = (handler) => async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
        }

        let tenantId = req.headers.get("x-tenant-id");
        
        // Fallback temporário para payload
        if (!tenantId && req.body) {
            try {
                const clonedReq = req.clone();
                const body = await clonedReq.json();
                tenantId = body.tenantId || body.workshop_id;
            } catch (e) {}
        }

        if (!tenantId) {
            return Response.json({ error: 'Bad Request: x-tenant-id header é obrigatório para isolamento de dados.' }, { status: 400 });
        }

        return await handler(req, { base44, user, tenantId });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

Deno.serve(withAuthAndTenant(async (req, { base44, user, tenantId }) => {
    try {
        // Dashboard Nacional fetched data points
        const [
            workshops,
            osAssessments,
            gameProfiles,
            userGameProfiles,
            employees,
            areaGoals,
            allUsers,
            userProgress
        ] = await Promise.all([
            base44.entities.Workshop.list(),
            base44.entities.ServiceOrderDiagnostic.list('-created_date'),
            base44.entities.WorkshopGameProfile.list(),
            base44.entities.UserGameProfile.list(),
            base44.entities.Employee.list(),
            base44.entities.AreaGoal.list(),
            base44.entities.User.list(),
            base44.entities.UserProgress.list()
        ]);

        const result = {
            workshops: Array.isArray(workshops) ? workshops : [],
            osAssessments: Array.isArray(osAssessments) ? osAssessments : [],
            gameProfiles: Array.isArray(gameProfiles) ? gameProfiles : [],
            userGameProfiles: Array.isArray(userGameProfiles) ? userGameProfiles : [],
            employees: Array.isArray(employees) ? employees : [],
            areaGoals: Array.isArray(areaGoals) ? areaGoals : [],
            allUsers: Array.isArray(allUsers) ? allUsers : [],
            userProgress: Array.isArray(userProgress) ? userProgress : []
        };

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=5'
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}));