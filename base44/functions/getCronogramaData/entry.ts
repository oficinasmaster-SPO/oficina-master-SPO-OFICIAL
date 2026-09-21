import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * getCronogramaData — BFF para /CronogramaConsultoria
 *
 * Problema que resolve:
 * O RLS das entidades (MeetingMinutes, ConsultoriaAtendimento, FollowUpReminder)
 * avalia o payload do JWT do usuário externo. JWTs emitidos antes do backfill
 * de julho/2026 têm data.workshop_id=null no payload — mesmo após atualização
 * no banco, o token em localStorage não é renovado automaticamente pelo Base44.
 * Resultado: RLS bloqueia leitura mesmo com dados corretos no banco.
 *
 * Solução:
 * Esta função roda como asServiceRole (service account — ignora RLS de usuário).
 * Valida manualmente que o usuário tem TenantMembership ativa na oficina
 * solicitada antes de retornar qualquer dado. Isso garante isolamento multi-tenant
 * sem depender do JWT do usuário externo.
 *
 * Input:  POST { workshop_id: string }
 * Output: { atendimentos, atas, followUps }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Autenticar
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Ler workshop_id do body
    let workshopId: string | null = null;
    try {
      const body = await req.json();
      workshopId = body?.workshop_id || null;
    } catch (_) {}

    if (!workshopId || typeof workshopId !== 'string') {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 3. Validar vínculo: admin bypassa, usuário externo precisa ter membership ativa
    const isAdmin = user.role === 'admin';
    const isInternal = user.data?.user_type === 'internal' || user.user_type === 'internal';

    if (!isAdmin && !isInternal) {
      const memberships = await sr.entities.TenantMembership.filter({
        user_id: user.id,
        workshop_id: workshopId,
        status: 'active',
      }).catch(() => []);

      if (!memberships || memberships.length === 0) {
        return Response.json({ error: 'Sem acesso a esta oficina' }, { status: 403 });
      }
    }

    // 4. Buscar dados em paralelo como service role (ignora JWT do usuário)
    const [atendimentos, atas, followUps] = await Promise.all([
      sr.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId },
        '-data_agendada',
        500
      ).catch(() => []),
      sr.entities.MeetingMinutes.filter(
        { workshop_id: workshopId },
        '-meeting_date',
        500
      ).catch(() => []),
      sr.entities.FollowUpReminder.filter(
        { workshop_id: workshopId },
        '-completed_at',
        500
      ).catch(() => []),
    ]);

    return Response.json({
      atendimentos: Array.isArray(atendimentos) ? atendimentos : [],
      atas: Array.isArray(atas) ? atas : [],
      followUps: Array.isArray(followUps) ? followUps : [],
    });

  } catch (error) {
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
