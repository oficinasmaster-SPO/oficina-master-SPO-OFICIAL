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
        // --- SERVICE: AutoavaliacoesService ---
        // Busca todos os diagnósticos do tenant em paralelo no servidor (baixa latência)
        
        const [
            processAssessments,
            diagnostics,
            entrepreneurDiagnostics,
            discDiagnostics
        ] = await Promise.all([
            base44.entities.ProcessAssessment.filter({ workshop_id: tenantId }),
            base44.entities.Diagnostic.filter({ workshop_id: tenantId }),
            base44.entities.EntrepreneurDiagnostic.filter({ workshop_id: tenantId }),
            base44.entities.DISCDiagnostic.filter({ workshop_id: tenantId })
        ]);

        const result = {
            processAssessments: processAssessments || [],
            diagnostics: diagnostics || [],
            entrepreneurDiagnostics: entrepreneurDiagnostics || [],
            discDiagnostics: discDiagnostics || []
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