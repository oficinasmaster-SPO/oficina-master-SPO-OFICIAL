import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { tenantId } = payload;

        // --- MIDDLEWARE: Auth & Tenant ---
        if (!tenantId) {
            return Response.json({ error: 'Tenant ID (workshop_id) is required' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
});