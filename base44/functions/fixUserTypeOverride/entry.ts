import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, user_type } = body || {};

    if (!userId || !user_type) {
      return Response.json({ error: 'userId and user_type are required' }, { status: 400 });
    }

    if (!['internal', 'external'].includes(user_type)) {
      return Response.json({ error: 'user_type must be "internal" or "external"' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, { user_type });
    const verifiedUser = await base44.asServiceRole.entities.User.get(userId);

    // Fase D — gap encontrado na validação: promoção manual para internal por
    // esta rota (ex.: ex-funcionário de oficina promovido a admin interno)
    // não passa por completeInviteOnFirstAccess nem createUserDirectly, então
    // ficava sem as TenantMemberships consultant. Espelha o mesmo provisionamento.
    let provisionamento = { criadas: 0 };
    if (user_type === 'internal') {
      try {
        const existentes = await base44.asServiceRole.entities.TenantMembership.filter({
          user_id: userId,
          membership_type: 'consultant',
          status: 'active'
        }, 'created_date', 500);
        const jaTem = new Set(existentes.map((m) => m.workshop_id));

        let skip = 0;
        let criadas = 0;
        while (true) {
          const batch = await base44.asServiceRole.entities.Workshop.filter({}, 'created_date', 200, skip);
          if (!batch || batch.length === 0) break;
          for (const ws of batch) {
            if (jaTem.has(ws.id)) continue;
            await base44.asServiceRole.entities.TenantMembership.create({
              user_id: userId,
              workshop_id: ws.id,
              company_id: ws.company_id || null,
              consulting_firm_id: ws.consulting_firm_id || null,
              membership_type: 'consultant',
              status: 'active',
              is_default: false,
              notes: 'provision-internal-consultant'
            });
            jaTem.add(ws.id);
            criadas++;
          }
          if (batch.length < 200) break;
          skip += 200;
        }
        provisionamento = { criadas };
      } catch (e) {
        console.error('⚠️ Falha ao provisionar consultant memberships (não bloqueante):', e.message);
      }
    }

    return Response.json({
      success: true,
      userId,
      user_type_applied: user_type,
      verified_user_type: verifiedUser?.user_type,
      consultant_memberships_criadas: provisionamento.criadas
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});