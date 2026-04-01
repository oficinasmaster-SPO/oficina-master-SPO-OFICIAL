import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    let vouchersExpired = 0;
    let usesExpired = 0;
    let notificationsCreated = 0;

    // ===== 1. Expirar vouchers ativos com data de expiração passada =====
    const activeVouchers = await base44.asServiceRole.entities.Voucher.filter(
      { status: 'active' }, '-created_date', 500
    );

    for (const voucher of activeVouchers) {
      let shouldExpire = false;

      // Expirar se tem expiration_date definida e já passou
      if (voucher.expiration_date && new Date(voucher.expiration_date) < now) {
        shouldExpire = true;
      }

      // Expirar se NÃO tem expiration_date mas foi criado há mais de 30 dias
      if (!voucher.expiration_date && voucher.created_date) {
        const createdAt = new Date(voucher.created_date);
        const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation >= 30) {
          shouldExpire = true;
        }
      }

      if (shouldExpire) {
        await base44.asServiceRole.entities.Voucher.update(voucher.id, {
          status: 'expired',
          notes: `${voucher.notes || ''}\n[AUTO] Expirado automaticamente em ${now.toISOString().split('T')[0]}.`.trim()
        });

        // Registrar no histórico de notificações
        for (const admin of admins.slice(0, 5)) {
          await base44.asServiceRole.entities.VoucherNotification.create({
            voucher_id: voucher.id,
            voucher_code: voucher.code,
            workshop_id: voucher.workshop_id,
            company_id: voucher.company_id,
            consulting_firm_id: voucher.consulting_firm_id,
            type: 'expired',
            title: '📅 Voucher Expirado Automaticamente',
            message: `O voucher ${voucher.code} (desconto: ${voucher.discount_type === 'percent' ? voucher.discount_percent + '%' : 'R$ ' + voucher.discount_value?.toFixed(2)}) expirou. Criado por ${voucher.seller_name || 'vendedor'}.`,
            sent_to_user_id: admin.id,
            triggered_by_user_id: voucher.seller_id,
            is_read: false,
            metadata: {
              reason: voucher.expiration_date ? 'expiration_date_passed' : '30_days_limit',
              expired_at: now.toISOString()
            }
          });
          notificationsCreated++;
        }

        // Notificar vendedor
        if (voucher.seller_id) {
          await base44.asServiceRole.entities.VoucherNotification.create({
            voucher_id: voucher.id,
            voucher_code: voucher.code,
            workshop_id: voucher.workshop_id,
            type: 'expired',
            title: '📅 Seu Voucher Expirou',
            message: `O voucher ${voucher.code} expirou e não pode mais ser utilizado.`,
            sent_to_user_id: voucher.seller_id,
            is_read: false
          });
        }

        vouchersExpired++;
      }
    }

    // ===== 2. Expirar usos pendentes que passaram de 48h sem aprovação =====
    const pendingUses = await base44.asServiceRole.entities.VoucherUse.filter(
      { status: 'pending' }, '-created_date', 500
    );

    for (const use of pendingUses) {
      if (!use.approval_deadline) continue;

      const deadline = new Date(use.approval_deadline);
      const hoursOverdue = (now - deadline) / (1000 * 60 * 60);

      // Se passou mais de 72h do prazo (48h + 24h de tolerância), rejeitar automaticamente
      if (hoursOverdue > 24) {
        await base44.asServiceRole.entities.VoucherUse.update(use.id, {
          status: 'rejected',
          rejection_reason: `[AUTO] Rejeitado automaticamente — prazo de aprovação de 48h expirou há ${Math.floor(hoursOverdue)}h sem ação administrativa.`,
          approved_at: now.toISOString()
        });

        // Reverter uso no voucher
        const voucher = await base44.asServiceRole.entities.Voucher.filter({ id: use.voucher_id });
        if (voucher && voucher.length > 0) {
          const v = voucher[0];
          const newUsesCount = Math.max(0, (v.uses_count || 1) - 1);
          await base44.asServiceRole.entities.Voucher.update(v.id, {
            uses_count: newUsesCount,
            status: newUsesCount < (v.max_uses || 1) ? 'active' : 'used'
          });
        }

        // Notificar admins
        for (const admin of admins.slice(0, 5)) {
          await base44.asServiceRole.entities.VoucherNotification.create({
            voucher_id: use.voucher_id,
            voucher_use_id: use.id,
            voucher_code: use.voucher_code,
            workshop_id: use.workshop_id,
            type: 'rejected',
            title: '⛔ Uso de Voucher Rejeitado Automaticamente',
            message: `O uso do voucher ${use.voucher_code} (cliente: ${use.client_name}, R$ ${use.sale_value?.toFixed(2)}) foi rejeitado automaticamente por falta de aprovação em 72h.`,
            sent_to_user_id: admin.id,
            is_read: false,
            metadata: {
              reason: 'auto_expired_72h',
              hours_overdue: Math.floor(hoursOverdue)
            }
          });

          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            workshop_id: use.workshop_id,
            type: 'status_alterado',
            title: '⛔ Voucher Rejeitado Automaticamente',
            message: `Uso do voucher ${use.voucher_code} para ${use.client_name} rejeitado automaticamente após 72h sem aprovação.`,
            is_read: false,
            metadata: { voucher_use_id: use.id, voucher_code: use.voucher_code }
          });
          notificationsCreated++;
        }

        // Notificar vendedor
        if (use.used_by_seller_id) {
          await base44.asServiceRole.entities.VoucherNotification.create({
            voucher_id: use.voucher_id,
            voucher_use_id: use.id,
            voucher_code: use.voucher_code,
            workshop_id: use.workshop_id,
            type: 'rejected',
            title: '⛔ Uso de Voucher Rejeitado',
            message: `Seu registro de uso do voucher ${use.voucher_code} para ${use.client_name} foi rejeitado automaticamente por falta de aprovação administrativa no prazo de 72h.`,
            sent_to_user_id: use.used_by_seller_id,
            is_read: false
          });
        }

        usesExpired++;
      }
    }

    return Response.json({
      success: true,
      vouchers_expired: vouchersExpired,
      uses_auto_rejected: usesExpired,
      notifications_created: notificationsCreated,
      checked_at: now.toISOString()
    });

  } catch (error) {
    console.error('Erro ao expirar vouchers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});