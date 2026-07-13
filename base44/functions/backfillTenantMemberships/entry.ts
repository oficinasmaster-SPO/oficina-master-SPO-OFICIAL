import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Backfill de TenantMemberships a partir das fontes existentes.
// Admin only. dry_run=true por padrão (só reporta, não grava).
// Chave de deduplicação: user_id + workshop_id + membership_type.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false; // default true

    const listAll = async (entityName) => {
      const all = [];
      let cursor = null;
      while (true) {
        const query = cursor ? { created_date: { $gt: cursor } } : {};
        const batch = await sr.entities[entityName].filter(query, 'created_date', 500);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        cursor = batch[batch.length - 1].created_date;
        if (batch.length < 500) break;
      }
      return all;
    };

    const [users, workshops, employees, existentes] = await Promise.all([
      listAll('User'),
      listAll('Workshop'),
      listAll('Employee'),
      listAll('TenantMembership')
    ]);

    const userIds = new Set(users.map((u) => u.id));
    const workshopById = new Map(workshops.map((w) => [w.id, w]));
    const getUserWorkshopIds = (u) => [u.workshop_id, u.data?.workshop_id].filter(Boolean);

    const key = (userId, workshopId, type) => `${userId}|${workshopId}|${type}`;
    const jaExiste = new Set(existentes.map((m) => key(m.user_id, m.workshop_id, m.membership_type)));

    // Propostas: Map key -> membership
    const propostas = new Map();
    const ignorados = { workshop_inexistente: 0, user_inexistente: 0, ja_existente: 0 };

    const propor = (m) => {
      const k = key(m.user_id, m.workshop_id, m.membership_type);
      if (!workshopById.has(m.workshop_id)) { ignorados.workshop_inexistente++; return; }
      if (!userIds.has(m.user_id)) { ignorados.user_inexistente++; return; }
      if (jaExiste.has(k)) { ignorados.ja_existente++; return; }
      if (!propostas.has(k)) propostas.set(k, m);
    };

    // 1. Employees ativos com user_id → type=employee
    for (const e of employees) {
      if (!e.user_id || !e.workshop_id) continue;
      if (e.status === 'inativo' || e.user_status === 'inativo' || e.user_status === 'bloqueado') continue;
      propor({
        user_id: e.user_id,
        workshop_id: e.workshop_id,
        company_id: e.company_id || workshopById.get(e.workshop_id)?.company_id || undefined,
        consulting_firm_id: e.consulting_firm_id || workshopById.get(e.workshop_id)?.consulting_firm_id || undefined,
        employee_id: e.id,
        profile_id: e.profile_id || undefined,
        membership_type: 'employee',
        status: 'active',
        is_default: false,
        notes: 'backfill-employee'
      });
    }

    // 2. Workshop.owner_id → type=owner (uma por Workshop)
    // 3. Workshop.partner_ids → type=partner
    for (const w of workshops) {
      if (w.owner_id) {
        propor({
          user_id: w.owner_id,
          workshop_id: w.id,
          company_id: w.company_id || undefined,
          consulting_firm_id: w.consulting_firm_id || undefined,
          membership_type: 'owner',
          status: 'active',
          is_default: false,
          notes: 'backfill-owner'
        });
      }
      for (const pid of w.partner_ids || []) {
        propor({
          user_id: pid,
          workshop_id: w.id,
          company_id: w.company_id || undefined,
          consulting_firm_id: w.consulting_firm_id || undefined,
          membership_type: 'partner',
          status: 'active',
          is_default: false,
          notes: 'backfill-partner'
        });
      }
    }

    // Conflitos — declarado antes do uso nas etapas 4+ (relatório final)
    const conflitos = [];

    // 4. Users internos com consulting_firm_id → type=consultant por workshop da consultoria
    // CORRIGIDO (auditoria): exigir user_type internal — um User externo com
    // consulting_firm_id residual não pode ganhar membership multi-oficina.
    for (const u of users) {
      const firmId = u.consulting_firm_id || u.data?.consulting_firm_id;
      if (!firmId) continue;
      const isInternal = u.user_type === 'internal' || u.data?.user_type === 'internal';
      if (!isInternal) {
        conflitos.push({ user_id: u.id, email: u.email, motivo: 'consulting_firm_id presente mas user_type nao-internal — membership consultant NAO criada; revisar manualmente' });
        continue;
      }
      for (const w of workshops) {
        if (w.consulting_firm_id !== firmId) continue;
        propor({
          user_id: u.id,
          workshop_id: w.id,
          company_id: w.company_id || undefined,
          consulting_firm_id: firmId,
          membership_type: 'consultant',
          status: 'active',
          is_default: false,
          notes: 'backfill-consultant'
        });
      }
    }

    // 5. User.workshop_id (raiz ou legado) sem NENHUMA membership no workshop → type=employee
    const temMembershipNoWorkshop = (userId, workshopId) => {
      for (const t of ['employee', 'owner', 'partner', 'consultant', 'admin_support']) {
        if (propostas.has(key(userId, workshopId, t)) || jaExiste.has(key(userId, workshopId, t))) return true;
      }
      return false;
    };
    for (const u of users) {
      for (const wid of getUserWorkshopIds(u)) {
        if (temMembershipNoWorkshop(u.id, wid)) continue;
        propor({
          user_id: u.id,
          workshop_id: wid,
          company_id: workshopById.get(wid)?.company_id || undefined,
          consulting_firm_id: workshopById.get(wid)?.consulting_firm_id || undefined,
          membership_type: 'employee',
          status: 'active',
          is_default: false,
          notes: 'backfill-user-field'
        });
      }
    }

    // is_default: membership cujo workshop_id == user.workshop_id; senão, primeira type=owner
    const propostasPorUser = new Map();
    for (const m of propostas.values()) {
      if (!propostasPorUser.has(m.user_id)) propostasPorUser.set(m.user_id, []);
      propostasPorUser.get(m.user_id).push(m);
    }
    for (const [uid, lista] of propostasPorUser.entries()) {
      const u = users.find((x) => x.id === uid);
      const preferido = u ? (u.workshop_id || u.data?.workshop_id) : null;
      // Se já existe membership default no banco, não marca outra
      const jaTemDefault = existentes.some((m) => m.user_id === uid && m.is_default);
      if (jaTemDefault) continue;
      let alvo = preferido ? lista.find((m) => m.workshop_id === preferido) : null;
      if (!alvo) alvo = lista.find((m) => m.membership_type === 'owner');
      if (alvo) alvo.is_default = true;
    }

    // Conflitos: usuário com mais de um membership_type (todas são criadas mesmo assim)
    // (array declarado antes da etapa 4)
    for (const [uid, lista] of propostasPorUser.entries()) {
      const existentesDoUser = existentes.filter((m) => m.user_id === uid);
      const tipos = new Set([...lista.map((m) => m.membership_type), ...existentesDoUser.map((m) => m.membership_type)]);
      if (tipos.size > 1) {
        const u = users.find((x) => x.id === uid);
        conflitos.push({
          user_id: uid,
          email: u?.email || null,
          tipos: Array.from(tipos),
          memberships: lista.map((m) => ({ workshop_id: m.workshop_id, membership_type: m.membership_type, notes: m.notes }))
        });
      }
    }

    const aCriar = Array.from(propostas.values());

    let criadas = 0;
    if (!dryRun && aCriar.length > 0) {
      for (let i = 0; i < aCriar.length; i += 200) {
        const chunk = aCriar.slice(i, i + 200);
        await sr.entities.TenantMembership.bulkCreate(chunk);
        criadas += chunk.length;
      }
    }

    const porTipo = {};
    for (const m of aCriar) porTipo[m.membership_type] = (porTipo[m.membership_type] || 0) + 1;

    return Response.json({
      executado_em: new Date().toISOString(),
      executado_por: user.email,
      dry_run: dryRun,
      totais_base: { users: users.length, workshops: workshops.length, employees: employees.length, memberships_existentes: existentes.length },
      resumo: {
        propostas: aCriar.length,
        criadas,
        por_tipo: porTipo,
        com_is_default: aCriar.filter((m) => m.is_default).length,
        ignorados
      },
      conflitos: { total: conflitos.length, itens: conflitos },
      amostra_propostas: aCriar.slice(0, 30)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});