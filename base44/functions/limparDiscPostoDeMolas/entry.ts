import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const workshopId = '697b986d267e4326dc3f5bf5';

        const registros = await base44.asServiceRole.entities.DISCDiagnostic.filter(
            { workshop_id: workshopId },
            null,
            1000
        );

        let deletados = 0;
        for (const r of registros) {
            await base44.asServiceRole.entities.DISCDiagnostic.delete(r.id);
            deletados++;
        }

        return Response.json({
            deletados,
            mensagem: `${deletados} registros DISC removidos do Posto de Molas.`
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});