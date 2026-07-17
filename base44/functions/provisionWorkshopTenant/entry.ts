import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * provisionWorkshopTenant — provisionamento canônico de tenant para Workshop novo.
 *
 * Chamado pelos fluxos de criação de Workshop (Cadastro, CadastroPlanos,
 * GestaoTenants, FiliaisWorkshop) logo após o create. Idempotente.
 *
 * 1. Garante consulting_firm_id no Workshop (fallback: primeira ConsultingFirm).
 * 2. Cria TenantMembership owner (+employee) para o dono — is_default se for a primeira.
 * 3. Cria TenantMembership consultant para todos os usuários internal ativos,
 *    para que a equipe interna possa "flutuar" sobre o cliente novo.
 *
 * Contexto: os 23 workshops criados entre 03/06 e 09/07 ficaram sem firm_id
 * (VITE_CONSULTING_FIRM_ID vazio no build) e sem memberships — este fluxo
 * fecha a torneira definitivamente.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshop_id } = await req.json().catch(() => ({}));
    if (!workshop_id) return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });

    const sr = base44.asServiceRole;
    const workshop = await sr.entities.Workshop.get(workshop_id).catch(() => null);
    if (!workshop) return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });

    // Autorização: dono do workshop recém-criado, admin ou internal.
    const isAdmin = user.role === 'admin';
    const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
    const isOwner = workshop.owner_id === user.id;
    if (!isAdmin && !isInternal && !isOwner) {
      return Response.json({ error: 'Acesso negado: sem vínculo com o workshop informado.' }, { status: 403 });
    }

    const acoes = { firm_setada: false, memberships_criadas: 0, ja_existiam: 0 };

    // 1. Garantir consulting_firm_id
    let firmId = workshop.consulting_firm_id || null;
    if (!firmId) {
      const firms = await sr.entities.ConsultingFirm.list('created_date', 1);
      firmId = firms?.[0]?.id || null;
      if (firmId) {
        await sr.entities.Workshop.update(workshop_id, { consulting_firm_id: firmId });
        acoes.firm_setada = true;
      }
    }

    // Helper idempotente
    const existentes = await sr.entities.TenantMembership.filter({ workshop_id }, 'created_date', 500);
    const jaExiste = (uid, type) => existentes.some((m) => m.user_id === uid && m.membership_type === type && m.status === 'active');

    const criarMembership = async (uid, type, extras = {}) => {
      if (jaExiste(uid, type)) { acoes.ja_existiam++; return; }
      // is_default apenas se o usuário não tiver nenhuma default
      let isDefault = false;
      if (type === 'owner' || type === 'employee') {
        const defaults = await sr.entities.TenantMembership.filter({ user_id: uid, is_default: true, status: 'active' });
        isDefault = !defaults || defaults.length === 0;
      }
      await sr.entities.TenantMembership.create({
        user_id: uid,
        workshop_id,
        company_id: workshop.company_id || null,
        consulting_firm_id: firmId,
        membership_type: type,
        status: 'active',
        is_default: isDefault,
        notes: 'provision-workshop-tenant',
        ...extras,
      });
      acoes.memberships_criadas++;
    };

    // 2. Dono: owner + employee
    if (workshop.owner_id) {
      await criarMembership(workshop.owner_id, 'owner');
      await criarMembership(workshop.owner_id, 'employee');
    }

    // 3. Internos: consultant (paginado por offset — não usar cursor de created_date)
    const internos = [];
    let skip = 0;
    while (true) {
      const batch = await sr.entities.User.filter({}, 'created_date', 200, skip);
      if (!batch || batch.length === 0) break;
      for (const u of batch) {
        const uInternal = u.user_type === 'internal' || u.data?.user_type === 'internal';
        if (uInternal) internos.push(u.id);
      }
      if (batch.length < 200) break;
      skip += 200;
    }
    for (const uid of internos) {
      await criarMembership(uid, 'consultant');
    }

    return Response.json({ success: true, workshop_id, consulting_firm_id: firmId, internos: internos.length, ...acoes });
  } catch (error) {
    console.error('provisionWorkshopTenant:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
