import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar usos pendentes
    const pendingUses = await base44.asServiceRole.entities.VoucherUse.filter(
      { status: 'pending' }, '-created_date', 500
    );

    if (!pendingUses || pendingUses.length === 0) {
      return Response.json({ success: true, message: 'Nenhum uso pendente', processed: 0 });
    }

    const now = new Date();
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    let notificationsCreated = 0;

    for (const use of pendingUses) {
      if (!use.approval_deadline) continue;

      const deadline = new Date(use.approval_deadline);
      const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

      // Notificar quando faltam menos de 6h para expirar o prazo de 48h
      if (hoursRemaining > 0 && hoursRemaining <= 6) {
        // Verificar se já notificou sobre este prazo hoje
        const today = now.toISOString().split('T')[0];
        const existing = await base44.asServiceRole.entities.VoucherNotification.filter({
          voucher_use_id: use.id,
          type: 'approval_deadline_warning'
        }, '-created_date', 5);

        const alreadyNotifiedToday = existing.some(n =>
          n.created_date && n.created_date.startsWith(today)
        );

        if (!alreadyNotifiedToday) {
          const hoursText = Math.floor(hoursRemaining);
          const minutesText = Math.round((hoursRemaining - hoursText) * 60);

          for (const admin of admins.slice(0, 5)) {
            await base44.asServiceRole.entities.VoucherNotification.create({
              voucher_id: use.voucher_id,
              voucher_use_id: use.id,
              voucher_code: use.voucher_code,
              workshop_id: use.workshop_id,
              type: 'approval_deadline_warning',
              title: '⏰ Prazo de Aprovação Expirando',
              message: `O voucher ${use.voucher_code} (cliente: ${use.client_name}) precisa ser aprovado em ${hoursText}h${minutesText}min. Venda: R$ ${use.sale_value?.toFixed(2)}.`,
              sent_to_user_id: admin.id,
              triggered_by_user_id: use.used_by_seller_id,
              is_read: false,
              metadata: {
                hours_remaining: hoursRemaining,
                deadline: use.approval_deadline
              }
            });

            await base44.asServiceRole.entities.Notification.create({
              user_id: admin.id,
              workshop_id: use.workshop_id,
              type: 'prazo_proximo',
              title: '⏰ Voucher — Prazo de Aprovação Expirando',
              message: `Voucher ${use.voucher_code} para ${use.client_name} expira em ${hoursText}h${minutesText}min. Aprove ou rejeite agora.`,
              is_read: false,
              metadata: {
                voucher_use_id: use.id,
                voucher_code: use.voucher_code,
                deadline: use.approval_deadline
              }
            });

            notificationsCreated++;
          }
        }
      }

      // Marcar como expirado se prazo passou (mas não altera status - admin ainda pode aprovar)
      if (hoursRemaining < 0) {
        const existing = await base44.asServiceRole.entities.VoucherNotification.filter({
          voucher_use_id: use.id,
          type: 'expired'
        }, '-created_date', 1);

        if (existing.length === 0) {
          for (const admin of admins.slice(0, 5)) {
            await base44.asServiceRole.entities.VoucherNotification.create({
              voucher_id: use.voucher_id,
              voucher_use_id: use.id,
              voucher_code: use.voucher_code,
              workshop_id: use.workshop_id,
              type: 'expired',
              title: '🚨 Prazo de Aprovação Expirado',
              message: `O prazo de 48h para aprovar o voucher ${use.voucher_code} (cliente: ${use.client_name}) EXPIROU. Ação urgente necessária.`,
              sent_to_user_id: admin.id,
              is_read: false
            });

            await base44.asServiceRole.entities.Notification.create({
              user_id: admin.id,
              workshop_id: use.workshop_id,
              type: 'processo_atrasado',
              title: '🚨 Voucher — Prazo Expirado',
              message: `Prazo de 48h do voucher ${use.voucher_code} para ${use.client_name} EXPIROU. Tome uma ação agora.`,
              is_read: false,
              metadata: {
                voucher_use_id: use.id,
                voucher_code: use.voucher_code
              }
            });

            notificationsCreated++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      pending_count: pendingUses.length,
      notifications_created: notificationsCreated
    });

  } catch (error) {
    console.error('Erro ao verificar prazos de vouchers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});