import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';
import { validarEConverterRespostas, calcularPerfilDISC } from '../../shared/discEngine/entry.ts';

// ─── Sprint 1 / C4: validação de acesso ao workshop ───────────────────────────────
// CÓPIA FIEL de checkWorkshopAccess em functions/submitAppForms/entry.ts (manter sincronizado).
async function checkWorkshopAccess(sr, user, workshop_id) {
  const workshop = await sr.entities.Workshop.get(workshop_id).catch(() => null);
  if (!workshop) return { ok: false, status: 404, error: 'Oficina não encontrada' };
  const isAdmin = user.role === 'admin';
  const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
  if (isAdmin || isInternal) return { ok: true, workshop };
  if (workshop.owner_id === user.id) return { ok: true, workshop };
  const legacyWid = user.workshop_id || user.tenant_workshop_id || user.data?.workshop_id;
  if (legacyWid === workshop_id) return { ok: true, workshop };
  const memberships = await sr.entities.TenantMembership.filter(
    { user_id: user.id, workshop_id, status: 'active' }
  ).catch(() => []);
  if (memberships.length > 0) return { ok: true, workshop };
  const byUserId = await sr.entities.Employee.filter({ workshop_id, user_id: user.id }).catch(() => []);
  const byEmail = user.email
    ? await sr.entities.Employee.filter({ workshop_id, email: user.email }).catch(() => [])
    : [];
  if ([...byUserId, ...byEmail].some((e) => e.status !== 'inativo')) return { ok: true, workshop };
  console.warn(`[submeterDiagnosticoDISC] ACESSO NEGADO: user ${user.id} (${user.email}) → workshop ${workshop_id}`);
  return { ok: false, status: 403, error: 'Sem acesso a esta oficina' };
}

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

    // ── Resolução da oficina: SEMPRE pelo cadastro do colaborador (Sprint 1 / C4) ──
    // O workshop_id do payload não é mais fonte de verdade; se vier diferente, recusa.
    const sr = base44.asServiceRole;
    const employee = await sr.entities.Employee.get(employeeId).catch(() => null);
    const workshopId = employee?.workshop_id || null;
    if (!workshopId) {
      return Response.json({ error: 'Oficina não resolvida para o colaborador' }, { status: 400 });
    }
    if (payload.workshop_id && payload.workshop_id !== workshopId) {
      return Response.json({ error: 'Colaborador não pertence à oficina informada' }, { status: 403 });
    }
    const access = await checkWorkshopAccess(sr, user, workshopId);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const created = await sr.entities.DISCDiagnostic.create({
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