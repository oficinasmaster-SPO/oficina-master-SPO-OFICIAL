import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ID da Oficinas Master — lido de env var, não mais hardcoded no código frontend
const CONSULTING_FIRM_ID = Deno.env.get('CONSULTING_FIRM_ID') || '69bab264d7c3fe5d367c3959';

const INTERNAL_JOB_ROLES = ['acelerador', 'consultor', 'mentor', 'socio_interno'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const requestingUser = await base44.auth.me();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      employees: { total: 0, updated_internal: 0, updated_external: 0, skipped: 0, errors: [] },
      users:     { total: 0, updated_internal: 0, updated_external: 0, skipped: 0, errors: [] },
    };

    // ─── BACKFILL EMPLOYEES ─────────────────────────────────────────────────
    console.log('🔄 Iniciando backfill de Employee.user_type...');

    const allEmployees = await base44.asServiceRole.entities.Employee.filter({});
    results.employees.total = allEmployees.length;
    console.log(`   Total de employees: ${allEmployees.length}`);

    for (const emp of allEmployees) {
      // Pular se já tem user_type definido (idempotência)
      if (emp.user_type === 'internal' || emp.user_type === 'external') {
        results.employees.skipped++;
        continue;
      }

      // Regra: interno se consulting_firm_id === firma OU job_role é interno
      const isInternal =
        emp.consulting_firm_id === CONSULTING_FIRM_ID ||
        emp.tipo_vinculo === 'interno' ||
        emp.is_internal === true ||
        INTERNAL_JOB_ROLES.includes(emp.job_role);

      const userType = isInternal ? 'internal' : 'external';

      try {
        await base44.asServiceRole.entities.Employee.update(emp.id, {
          user_type: userType,
          tipo_vinculo: isInternal ? 'interno' : 'cliente',
          is_internal: isInternal,
        });

        if (isInternal) results.employees.updated_internal++;
        else            results.employees.updated_external++;

      } catch (err) {
        results.employees.errors.push({ id: emp.id, name: emp.full_name, error: err.message });
      }
    }

    // ─── BACKFILL USERS ─────────────────────────────────────────────────────
    console.log('🔄 Iniciando backfill de User.user_type...');

    const allUsers = await base44.asServiceRole.entities.User.filter({});
    results.users.total = allUsers.length;
    console.log(`   Total de users: ${allUsers.length}`);

    for (const usr of allUsers) {
      if (usr.user_type === 'internal' || usr.user_type === 'external') {
        results.users.skipped++;
        continue;
      }

      const isInternal =
        usr.consulting_firm_id === CONSULTING_FIRM_ID ||
        usr.role === 'admin' ||
        usr.role === 'super_admin' ||
        INTERNAL_JOB_ROLES.includes(usr.job_role);

      const userType = isInternal ? 'internal' : 'external';

      try {
        await base44.asServiceRole.entities.User.update(usr.id, {
          user_type: userType,
        });

        if (isInternal) results.users.updated_internal++;
        else            results.users.updated_external++;

      } catch (err) {
        results.users.errors.push({ id: usr.id, error: err.message });
      }
    }

    // ─── RELATÓRIO FINAL ────────────────────────────────────────────────────
    console.log('✅ Backfill concluído:', JSON.stringify(results, null, 2));

    return Response.json({
      success: true,
      consulting_firm_id_usado: CONSULTING_FIRM_ID,
      results,
      proximos_passos: [
        '1. Verificar contagens: employees.updated_internal deve ser ~equipe Oficinas Master',
        '2. Verificar contagens: employees.updated_external deve ser ~177 - equipe interna',
        '3. Aplicar User.jsonc e Employee.jsonc corrigidos no painel Base44',
        '4. Deploy do hook useUserType.js no frontend',
        '5. Substituir verificações antigas (tipo_vinculo, is_internal) pelo hook',
      ],
    });

  } catch (error) {
    console.error('❌ Erro no backfill:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});