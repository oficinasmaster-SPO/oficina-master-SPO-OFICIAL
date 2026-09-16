import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { waitUntil } from 'base44:runtime';
import { validarEConverterRespostas, calcularPerfilDISC } from '../../shared/discEngine/entry.ts';

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
            // Sprint 3: submissão unificada — rankings crus (1 = mais parecido),
            // cálculo centralizado no motor único e disparo de e-mail no pipeline.
            const { session_id, answers, candidateData } = data;

            const session = await base44.asServiceRole.entities.DISCPublicSession.get(session_id).catch(() => null);
            if (!session) return Response.json({ error: 'Sessão não encontrada' }, { status: 404 });
            if (session.status === 'concluido') return Response.json({ error: 'Teste já realizado para este link' }, { status: 400 });

            const validacao = validarEConverterRespostas(answers);
            if (validacao.error) return Response.json({ error: validacao.error }, { status: 400 });

            const { profileScores, dominant, recommendedRoles } = calcularPerfilDISC(validacao.answers);

            const diag = await base44.asServiceRole.entities.DISCDiagnostic.create({
                workshop_id: session.workshop_id,
                employee_id: session.employee_id || null,
                candidate_id: session.employee_id ? null : 'external_candidate',
                candidate_name: candidateData?.candidate_name || null,
                evaluation_type: 'self',
                answers: validacao.answers,
                profile_scores: profileScores,
                dominant_profile: dominant,
                recommended_roles: recommendedRoles,
                completed: true,
                invite_id: session.id
            });

            await base44.asServiceRole.entities.DISCPublicSession.update(session_id, {
                status: "concluido",
                completed_at: new Date().toISOString(),
                candidate_name: candidateData?.candidate_name || null,
                candidate_phone: candidateData?.candidate_phone || null,
                candidate_email: candidateData?.candidate_email || null,
                result_id: diag.id
            });

            // Pipeline de e-mail — assíncrono; travas antirreenvio no destino
            waitUntil(
                base44.asServiceRole.functions.invoke('enviarResultadoDISC', { diagnostic_id: diag.id }).catch(() => {})
            );

            return Response.json({ success: true, diag_id: diag.id, profile_scores: profileScores, dominant_profile: dominant });
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