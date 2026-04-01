import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      voucher_code,
      client_name,
      client_document,
      client_phone,
      sale_value,
      negotiation_notes
    } = body;

    if (!voucher_code || !client_name || !sale_value) {
      return Response.json({ 
        error: 'Código do voucher, nome do cliente e valor da venda são obrigatórios' 
      }, { status: 400 });
    }

    if (sale_value <= 0) {
      return Response.json({ error: 'Valor da venda deve ser maior que zero' }, { status: 400 });
    }

    // 1. Buscar voucher pelo código
    const vouchers = await base44.asServiceRole.entities.Voucher.filter({ code: voucher_code.trim().toUpperCase() });

    if (!vouchers || vouchers.length === 0) {
      return Response.json({ error: 'Voucher não encontrado. Verifique o código.' }, { status: 404 });
    }

    const voucher = vouchers[0];

    // 2. Validar status
    if (voucher.status !== 'active') {
      const statusMsg = {
        used: 'Este voucher já foi totalmente utilizado.',
        pending_approval: 'Este voucher está aguardando aprovação de uso anterior.',
        approved: 'Este voucher já foi aprovado e encerrado.',
        rejected: 'Este voucher foi rejeitado.',
        expired: 'Este voucher expirou.'
      };
      return Response.json({ 
        error: statusMsg[voucher.status] || 'Voucher não está ativo.' 
      }, { status: 400 });
    }

    // 3. Validar expiração
    if (voucher.expiration_date && new Date(voucher.expiration_date) < new Date()) {
      // Marcar como expirado
      await base44.asServiceRole.entities.Voucher.update(voucher.id, { status: 'expired' });
      return Response.json({ error: 'Este voucher expirou.' }, { status: 400 });
    }

    // 4. Validar limite de usos
    if (voucher.uses_count >= voucher.max_uses) {
      await base44.asServiceRole.entities.Voucher.update(voucher.id, { status: 'used' });
      return Response.json({ error: 'Este voucher atingiu o limite máximo de usos.' }, { status: 400 });
    }

    // 5. Calcular desconto
    let discountApplied = 0;
    if (voucher.discount_type === 'percent') {
      discountApplied = (sale_value * (voucher.discount_percent || 0)) / 100;
    } else {
      discountApplied = Math.min(voucher.discount_value || 0, sale_value);
    }
    const finalValue = Math.max(0, sale_value - discountApplied);

    // 6. Prazo de 48h para aprovação
    const now = new Date();
    const approvalDeadline = new Date(now);
    approvalDeadline.setHours(approvalDeadline.getHours() + 48);

    // 7. Criar registro de uso
    const voucherUse = await base44.asServiceRole.entities.VoucherUse.create({
      voucher_id: voucher.id,
      voucher_code: voucher.code,
      workshop_id: voucher.workshop_id,
      company_id: voucher.company_id || null,
      consulting_firm_id: voucher.consulting_firm_id || null,
      client_name,
      client_document: client_document || null,
      client_phone: client_phone || null,
      sale_value,
      discount_applied: discountApplied,
      final_value: finalValue,
      used_at: now.toISOString(),
      used_by_seller_id: user.id,
      used_by_seller_name: user.full_name || user.email,
      status: 'pending',
      negotiation_notes: negotiation_notes || null,
      approval_deadline: approvalDeadline.toISOString()
    });

    // 8. Atualizar voucher
    const newUsesCount = (voucher.uses_count || 0) + 1;
    const newStatus = newUsesCount >= voucher.max_uses ? 'pending_approval' : 'active';

    await base44.asServiceRole.entities.Voucher.update(voucher.id, {
      uses_count: newUsesCount,
      status: newStatus
    });

    // 9. Notificar admins globais
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const discountText = voucher.discount_type === 'percent'
      ? `${voucher.discount_percent}%`
      : `R$ ${voucher.discount_value?.toFixed(2)}`;

    for (const admin of admins.slice(0, 5)) {
      // Notificação específica de voucher
      await base44.asServiceRole.entities.VoucherNotification.create({
        voucher_id: voucher.id,
        voucher_use_id: voucherUse.id,
        voucher_code: voucher.code,
        workshop_id: voucher.workshop_id,
        company_id: voucher.company_id || null,
        consulting_firm_id: voucher.consulting_firm_id || null,
        type: 'voucher_used',
        title: '🛒 Voucher Utilizado',
        message: `${user.full_name || user.email} registrou o uso do voucher ${voucher.code} (${discountText}) para o cliente ${client_name}. Venda: R$ ${sale_value.toFixed(2)} → R$ ${finalValue.toFixed(2)}. Aprovação necessária em 48h.`,
        sent_to_user_id: admin.id,
        triggered_by_user_id: user.id,
        is_read: false,
        metadata: {
          sale_value,
          discount_applied: discountApplied,
          final_value: finalValue,
          client_name,
          approval_deadline: approvalDeadline.toISOString()
        }
      });

      // Notificação geral (sino)
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        workshop_id: voucher.workshop_id,
        type: 'status_alterado',
        title: '🛒 Voucher Utilizado — Aprovação Pendente',
        message: `Voucher ${voucher.code} usado por ${user.full_name || user.email} para ${client_name}. Venda R$ ${sale_value.toFixed(2)}, desconto ${discountText}. Prazo: 48h para aprovar.`,
        is_read: false,
        metadata: {
          voucher_id: voucher.id,
          voucher_use_id: voucherUse.id,
          voucher_code: voucher.code,
          approval_deadline: approvalDeadline.toISOString()
        }
      });
    }

    return Response.json({
      success: true,
      use: {
        id: voucherUse.id,
        voucher_code: voucher.code,
        client_name,
        sale_value,
        discount_applied: discountApplied,
        final_value: finalValue,
        approval_deadline: approvalDeadline.toISOString(),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Erro ao usar voucher:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});