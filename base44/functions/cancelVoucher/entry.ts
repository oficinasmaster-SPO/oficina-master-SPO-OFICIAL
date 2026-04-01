import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { voucher_id, reason } = body;

    if (!voucher_id) {
      return Response.json({ error: 'voucher_id é obrigatório' }, { status: 400 });
    }

    // Buscar voucher
    const vouchers = await base44.asServiceRole.entities.Voucher.filter({ id: voucher_id });
    if (!vouchers || vouchers.length === 0) {
      return Response.json({ error: 'Voucher não encontrado' }, { status: 404 });
    }
    const voucher = vouchers[0];

    // Verificar permissão: admin pode cancelar qualquer um, vendedor só o próprio
    if (user.role !== 'admin' && voucher.seller_id !== user.id) {
      return Response.json({ error: 'Sem permissão para cancelar este voucher' }, { status: 403 });
    }

    // Só pode cancelar vouchers ativos
    if (!['active'].includes(voucher.status)) {
      return Response.json({ 
        error: `Não é possível cancelar um voucher com status "${voucher.status}". Apenas vouchers ativos podem ser cancelados.` 
      }, { status: 400 });
    }

    // Verificar se há usos pendentes
    const pendingUses = await base44.asServiceRole.entities.VoucherUse.filter({
      voucher_id: voucher.id,
      status: 'pending'
    });

    if (pendingUses && pendingUses.length > 0) {
      return Response.json({ 
        error: 'Este voucher possui usos pendentes de aprovação. Resolva-os antes de cancelar.' 
      }, { status: 400 });
    }

    const now = new Date();

    // Cancelar o voucher
    await base44.asServiceRole.entities.Voucher.update(voucher.id, {
      status: 'cancelled',
      cancelled_by: user.id,
      cancelled_by_name: user.full_name || user.email,
      cancelled_at: now.toISOString(),
      cancellation_reason: reason || 'Cancelado pelo usuário'
    });

    // Notificar admins (se cancelado por vendedor)
    if (user.role !== 'admin') {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins.slice(0, 5)) {
        await base44.asServiceRole.entities.VoucherNotification.create({
          voucher_id: voucher.id,
          voucher_code: voucher.code,
          workshop_id: voucher.workshop_id,
          company_id: voucher.company_id || null,
          consulting_firm_id: voucher.consulting_firm_id || null,
          type: 'voucher_created',
          title: '🚫 Voucher Cancelado',
          message: `${user.full_name || user.email} cancelou o voucher ${voucher.code}. Motivo: ${reason || 'Não informado'}`,
          sent_to_user_id: admin.id,
          triggered_by_user_id: user.id,
          is_read: false
        });
      }
    }

    // Notificar vendedor (se cancelado por admin)
    if (user.role === 'admin' && voucher.seller_id && voucher.seller_id !== user.id) {
      await base44.asServiceRole.entities.VoucherNotification.create({
        voucher_id: voucher.id,
        voucher_code: voucher.code,
        workshop_id: voucher.workshop_id,
        type: 'voucher_created',
        title: '🚫 Voucher Cancelado',
        message: `O admin ${user.full_name || user.email} cancelou seu voucher ${voucher.code}. Motivo: ${reason || 'Não informado'}`,
        sent_to_user_id: voucher.seller_id,
        triggered_by_user_id: user.id,
        is_read: false
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: voucher.seller_id,
        workshop_id: voucher.workshop_id,
        type: 'status_alterado',
        title: '🚫 Voucher Cancelado pelo Admin',
        message: `Seu voucher ${voucher.code} foi cancelado por ${user.full_name || user.email}. Motivo: ${reason || 'Não informado'}`,
        is_read: false
      });
    }

    return Response.json({
      success: true,
      voucher_id: voucher.id,
      code: voucher.code,
      status: 'cancelled'
    });

  } catch (error) {
    console.error('Erro ao cancelar voucher:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});