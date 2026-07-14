import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Auditoria de integridade de tenant — SOMENTE LEITURA.
// asServiceRole permitido (diagnóstico), mas restrito a role=admin.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // Paginação determinística por deslocamento evita perder registros quando mais
    // de 500 itens compartilham o mesmo created_date; dedupe por id protege o resultado.
    const listAll = async (entityName) => {
      const byId = new Map();
      let skip = 0;
      while (true) {
        const batch = await sr.entities[entityName].filter({}, 'created_date', 500, skip);
        if (!batch || batch.length === 0) break;
        let novos = 0;
        for (const rec of batch) {
          if (!byId.has(rec.id)) { byId.set(rec.id, rec); novos++; }
        }
        if (batch.length < 500 || novos === 0) break;
        skip += batch.length;
      }
      return [...byId.values()];
    };

    const [users, workshops, employees, invites, profiles] = await Promise.all([
      listAll('User'),
      listAll('Workshop'),
      listAll('Employee'),
      listAll('EmployeeInvite'),
      listAll('UserProfile')
    ]);

    const userIds = new Set(users.map((u) => u.id));
    const usersByEmail = new Map(users.map((u) => [String(u.email || '').toLowerCase(), u]));
    const workshopIds = new Set(workshops.map((w) => w.id));
    const profileIds = new Set(profiles.map((p) => p.id));

    const getUserWorkshopIds = (u) => [u.workshop_id, u.data?.workshop_id].filter(Boolean);

    // 1. Employees cujo user_id aponta para User inexistente
    const employeesUserInexistente = employees
      .filter((e) => e.user_id && !userIds.has(e.user_id))
      .map((e) => ({ employee_id: e.id, email: e.email, full_name: e.full_name, user_id: e.user_id, workshop_id: e.workshop_id }));

    // 2. Users cujo workshop_id (raiz ou legado) aponta para Workshop inexistente
    const usersWorkshopInexistente = users
      .map((u) => {
        const invalidos = getUserWorkshopIds(u).filter((wid) => !workshopIds.has(wid));
        return invalidos.length > 0
          ? { user_id: u.id, email: u.email, workshop_ids_invalidos: invalidos, workshop_id_raiz: u.workshop_id || null, workshop_id_legado: u.data?.workshop_id || null }
          : null;
      })
      .filter(Boolean);

    // 3. Employees cujo workshop_id aponta para Workshop inexistente
    const employeesWorkshopInexistente = employees
      .filter((e) => e.workshop_id && !workshopIds.has(e.workshop_id))
      .map((e) => ({ employee_id: e.id, email: e.email, full_name: e.full_name, workshop_id: e.workshop_id }));

    // 4. Pares User/Employee com workshop_id divergente (por user_id ou email)
    const paresDivergentes = [];
    for (const e of employees) {
      if (!e.workshop_id) continue;
      let u = e.user_id ? users.find((x) => x.id === e.user_id) : null;
      if (!u && e.email) u = usersByEmail.get(String(e.email).toLowerCase());
      if (!u) continue;
      const uWids = getUserWorkshopIds(u);
      if (uWids.length > 0 && !uWids.includes(e.workshop_id)) {
        paresDivergentes.push({
          employee_id: e.id,
          user_id: u.id,
          email: e.email || u.email,
          employee_workshop_id: e.workshop_id,
          user_workshop_id_raiz: u.workshop_id || null,
          user_workshop_id_legado: u.data?.workshop_id || null
        });
      }
    }

    // 5. Employees com profile_id inexistente
    const employeesProfileInexistente = employees
      .filter((e) => e.profile_id && !profileIds.has(e.profile_id))
      .map((e) => ({ employee_id: e.id, email: e.email, full_name: e.full_name, profile_id: e.profile_id }));

    // 6. Employees sem user_id: com convite pendente vs órfão
    const invitesPendentesByEmployeeId = new Set();
    const invitesPendentesByEmail = new Set();
    for (const inv of invites) {
      if (inv.status === 'enviado' || inv.status === 'acessado') {
        if (inv.employee_id) invitesPendentesByEmployeeId.add(inv.employee_id);
        if (inv.email) invitesPendentesByEmail.add(String(inv.email).toLowerCase());
      }
    }
    const semUserComConvite = [];
    const semUserOrfaos = [];
    for (const e of employees) {
      if (e.user_id) continue;
      const item = { employee_id: e.id, email: e.email, full_name: e.full_name, workshop_id: e.workshop_id };
      const temConvite = invitesPendentesByEmployeeId.has(e.id) ||
        (e.email && invitesPendentesByEmail.has(String(e.email).toLowerCase()));
      if (temConvite) semUserComConvite.push(item);
      else semUserOrfaos.push(item);
    }

    // 7. Users vinculados (owner/partner) a mais de um Workshop
    const vinculosPorUser = new Map();
    for (const w of workshops) {
      const addVinculo = (uid, papel) => {
        if (!uid) return;
        if (!vinculosPorUser.has(uid)) vinculosPorUser.set(uid, []);
        vinculosPorUser.get(uid).push({ workshop_id: w.id, workshop_name: w.name, papel });
      };
      addVinculo(w.owner_id, 'owner');
      for (const pid of w.partner_ids || []) addVinculo(pid, 'partner');
    }
    const usersMultiOficina = [];
    for (const [uid, vinculos] of vinculosPorUser.entries()) {
      const oficinasUnicas = new Set(vinculos.map((v) => v.workshop_id));
      if (oficinasUnicas.size > 1) {
        const u = users.find((x) => x.id === uid);
        usersMultiOficina.push({ user_id: uid, email: u?.email || null, existe_user: !!u, oficinas: vinculos });
      }
    }

    // 8. Registros de dados com workshop_id inexistente (paginando tudo)
    const entidadesDados = [
      'DREMonthly', 'DRELancamento', 'ContaPagar', 'ContaReceber',
      'ConsultoriaAtendimento', 'ConsultoriaSprint', 'Task', 'CronogramaImplementacao'
    ];
    const registrosOrfaos = {};
    for (const name of entidadesDados) {
      try {
        const records = await listAll(name);
        const orfaos = records.filter((r) => r.workshop_id && !workshopIds.has(r.workshop_id));
        const porOficina = {};
        for (const r of orfaos) {
          porOficina[r.workshop_id] = (porOficina[r.workshop_id] || 0) + 1;
        }
        registrosOrfaos[name] = {
          total_registros: records.length,
          total_orfaos: orfaos.length,
          workshop_ids_inexistentes: porOficina,
          ids_orfaos: orfaos.map((r) => r.id)
        };
      } catch (error) {
        registrosOrfaos[name] = { erro: error.message };
      }
    }

    return Response.json({
      executado_em: new Date().toISOString(),
      executado_por: user.email,
      totais_base: {
        users: users.length,
        workshops: workshops.length,
        employees: employees.length,
        invites: invites.length,
        profiles: profiles.length
      },
      relatorio: {
        "1_employees_com_user_id_inexistente": { total: employeesUserInexistente.length, itens: employeesUserInexistente },
        "2_users_com_workshop_id_inexistente": { total: usersWorkshopInexistente.length, itens: usersWorkshopInexistente },
        "3_employees_com_workshop_id_inexistente": { total: employeesWorkshopInexistente.length, itens: employeesWorkshopInexistente },
        "4_pares_user_employee_workshop_divergente": { total: paresDivergentes.length, itens: paresDivergentes },
        "5_employees_com_profile_id_inexistente": { total: employeesProfileInexistente.length, itens: employeesProfileInexistente },
        "6_employees_sem_user_id": {
          com_convite_pendente: { total: semUserComConvite.length, itens: semUserComConvite },
          orfaos_sem_convite: { total: semUserOrfaos.length, itens: semUserOrfaos }
        },
        "7_users_multi_oficina": { total: usersMultiOficina.length, itens: usersMultiOficina },
        "8_registros_com_workshop_id_inexistente": registrosOrfaos
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});