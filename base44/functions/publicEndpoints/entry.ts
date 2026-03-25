import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        const { action, data } = payload;
        
        if (action === 'getWorkshopInfo') {
            const { workshop_id } = data;
            const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
            if (!workshop) return Response.json({ error: 'Workshop not found' }, { status: 404 });
            return Response.json({ 
                id: workshop.id, 
                name: workshop.name, 
                logo_url: workshop.logo_url 
            });
        }
        
        if (action === 'getDiscSession') {
            const { token } = data;
            const sessions = await base44.asServiceRole.entities.DISCPublicSession.filter({ token });
            if (!sessions || sessions.length === 0) return Response.json({ error: 'Session not found' }, { status: 404 });
            const session = sessions[0];
            const workshop = await base44.asServiceRole.entities.Workshop.get(session.workshop_id);
            return Response.json({ session, workshop: { id: workshop?.id, name: workshop?.name, logo_url: workshop?.logo_url } });
        }

        if (action === 'submitDisc') {
            const { session_id, diagData, candidateData } = data;
            const diag = await base44.asServiceRole.entities.DISCDiagnostic.create(diagData);
            await base44.asServiceRole.entities.DISCPublicSession.update(session_id, {
                status: "concluido",
                completed_at: new Date().toISOString(),
                ...candidateData,
                result_id: diag.id
            });
            return Response.json({ success: true, diag_id: diag.id });
        }

        if (action === 'submitNps') {
            const nps = await base44.asServiceRole.entities.NPSResponse.create(data);
            return Response.json({ success: true, id: nps.id });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});