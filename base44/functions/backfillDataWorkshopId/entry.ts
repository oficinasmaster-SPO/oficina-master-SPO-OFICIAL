/**
 * backfillDataWorkshopId — backfill único de user.data.workshop_id.
 *
 * RAIZ DO PROBLEMA: as regras RLS de MeetingMinutes, ConsultoriaAtendimento,
 * FollowUpReminder, Employee, etc. usam {{user.data.workshop_id}} como único
 * critério que resolve para clientes externos (role=user, user_type=external).
 * Campos top-level do User (workshop_id, tenant_workshop_id) NÃO resolvem em
 * templates RLS — apenas {{user.data.<field>}} resolve.
 *
 * O resolveTenant espelha data.workshop_id na sessão, mas só para usuários que
 * logaram DEPOIS do deploy daquela sincronização. Usuários externos que não
 * logaram desde então ficam com data.workshop_id nulo → veem 0 atas/atendimentos.
 *
 * Esta function popula data.workshop_id para TODOS os externos a partir da
 * TenantMembership ativa (workshop default). Idempotente: só atualiza quem está
 * nulo ou divergente. Admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar o backfill' }, { status: 403 });
    }

    const sr = base44.asServiceRole;

    // 1. Paginar TODAS as memberships ativas
    let allMemberships = [];
    let skip = 0;
    while (true) {
      const batch = await sr.entities.TenantMembership.filter(
        { status: 'active' }, 'created_date', 500, skip
      );
      allMemberships = allMemberships.concat(batch);
      if (batch.length < 500) break;
      skip += 500;
      if (skip > 10000) break;
    }

    // 2. user_id -> workshop_id padrão (is_default > único > primeiro)
    const userDefaultWs = {};
    for (const m of allMemberships) {
      if (!m.user_id || !m.workshop_id) continue;
      if (!userDefaultWs[m.user_id] || m.is_default) {
        userDefaultWs[m.user_id] = m.workshop_id;
      }
    }

    // 3. Todos os Users (paginado)
    let allUsers = [];
    let uskip = 0;
    while (true) {
      const batch = await sr.entities.User.list('-created_date', 500, uskip);
      allUsers = allUsers.concat(batch);
      if (batch.length < 500) break;
      uskip += 500;
      if (uskip > 5000) break;
    }

    // 4. Identificar afetados (externos com data.workshop_id nulo/divergente)
    const afetados = [];
    let admins = 0, ok = 0, semMembership = 0;
    for (const u of allUsers) {
      const wsId = userDefaultWs[u.id];
      if (!wsId) { semMembership++; continue; }
      if (u.role === 'admin') { admins++; continue; }
      const current = u.data?.workshop_id || null;
      if (current === wsId) { ok++; continue; }
      afetados.push({ id: u.id, email: u.email, wsId, antes: current, data: u.data || {} });
    }

    // 5. Update individual (User não suporta bulkUpdate de data) com throttle
    let atualizados = 0, falhou = 0;
    const erros = [];
    for (let i = 0; i < afetados.length; i++) {
      const a = afetados[i];
      try {
        await sr.entities.User.update(a.id, {
          data: { ...a.data, workshop_id: a.wsId },
        });
        atualizados++;
      } catch (e) {
        falhou++;
        if (erros.length < 5) erros.push({ email: a.email, erro: e.message });
      }
      // throttle a cada 20 updates para evitar 429
      if (i > 0 && i % 20 === 0) await sleep(300);
    }

    return Response.json({
      total_memberships: allMemberships.length,
      total_users: allUsers.length,
      externos_ok_antes: ok,
      admins_com_membership: admins,
      sem_membership: semMembership,
      afetados_encontrados: afetados.length,
      atualizados,
      falhou,
      erros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}