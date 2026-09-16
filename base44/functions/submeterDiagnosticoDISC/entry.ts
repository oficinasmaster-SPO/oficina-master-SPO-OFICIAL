import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';
import { validarEConverterRespostas, calcularPerfilDISC } from '../../shared/discEngine/entry.ts';

// Caminho único de submissão DISC autenticada (autoavaliação e diagnóstico do gestor).
// Padrão: rank 1 = mais parecido. Conversão e cálculo vivem no motor compartilhado (shared/discEngine).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const payload = await req.json().catch(() => null);
    if (!payload) return Response.json({ error: 'Payload inválido' }, { status: 400 });

    const employeeId = payload.employee_id;
    const evaluationType = payload.evaluation_type === 'self' ? 'self' : 'manager';
    if (!employeeId) return Response.json({ error: 'Colaborador avaliado é obrigatório' }, { status: 400 });

    const validacao = validarEConverterRespostas(payload.answers);
    if (validacao.error) return Response.json({ error: validacao.error }, { status: 400 });

    const { profileScores, dominant, recommendedRoles } = calcularPerfilDISC(validacao.answers);

    // ── Resolução da oficina (fonte: payload ou cadastro do colaborador) ──
    let workshopId = payload.workshop_id || null;
    if (!workshopId) {
      const employee = await base44.entities.Employee.get(employeeId).catch(() => null);
      workshopId = employee?.workshop_id || null;
    }
    if (!workshopId) {
      return Response.json({ error: 'Oficina não resolvida para o colaborador' }, { status: 400 });
    }

    const created = await base44.entities.DISCDiagnostic.create({
      employee_id: employeeId,
      evaluator_id: user.id,
      workshop_id: workshopId,
      evaluation_type: evaluationType,
      is_leader: payload.is_leader === true,
      team_name: payload.team_name || null,
      answers: validacao.answers,
      profile_scores: profileScores,
      dominant_profile: dominant,
      recommended_roles: recommendedRoles,
      completed: true
    });

    // Gatilho do pipeline de e-mail — assíncrono; travas antirreenvio ficam no destino
    waitUntil(
      base44.functions.invoke('enviarResultadoDISC', { diagnostic_id: created.id }).catch(() => {})
    );

    return Response.json({
      ok: true,
      id: created.id,
      dominant_profile: dominant,
      profile_scores: profileScores
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}