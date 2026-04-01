import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateUniqueCode(prefix = 'OM') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      workshop_id,
      company_id,
      consulting_firm_id,
      discount_type = 'percent',
      discount_percent,
      discount_value,
      description,
      max_uses = 1
    } = body;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // 1. Verificar se vendedor tem regras configuradas e está autorizado
    const sellerRules = await base44.asServiceRole.entities.VoucherSellerRule.filter({
      seller_id: user.id,
      workshop_id,
      active: true
    });

    if (!sellerRules || sellerRules.length === 0) {
      // Se for admin, permitir sem regras
      if (user.role !== 'admin') {
        return Response.json({ 
          error: 'Você não está autorizado a gerar vouchers. Solicite autorização ao administrador.' 
        }, { status: 403 });
      }
    }

    const rule = sellerRules[0];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 2. Verificar limite mensal (se não for admin)
    if (rule && user.role !== 'admin') {
      let monthlyCount = rule.vouchers_used_this_month || 0;
      
      // Reset contador se mudou o mês
      if (rule.current_month !== currentMonth) {
        monthlyCount = 0;
      }

      if (monthlyCount >= rule.max_vouchers_per_month) {
        return Response.json({ 
          error: `Limite mensal atingido. Você já gerou ${monthlyCount}/${rule.max_vouchers_per_month} vouchers este mês.` 
        }, { status: 403 });
      }

      // 3. Verificar limite de desconto
      if (discount_type === 'percent') {
        if (discount_percent > (rule.max_discount_percent || 100)) {
          return Response.json({ 
            error: `Desconto máximo permitido: ${rule.max_discount_percent}%. Você tentou ${discount_percent}%.` 
          }, { status: 400 });
        }
      } else if (discount_type === 'fixed') {
        if (rule.max_discount_value && discount_value > rule.max_discount_value) {
          return Response.json({ 
            error: `Desconto fixo máximo permitido: R$ ${rule.max_discount_value}. Você tentou R$ ${discount_value}.` 
          }, { status: 400 });
        }
      }
    }

    // 4. Gerar código único
    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateUniqueCode();
      const existing = await base44.asServiceRole.entities.Voucher.filter({ code });
      if (!existing || existing.length === 0) break;
      attempts++;
    }
    if (attempts >= 10) {
      return Response.json({ error: 'Erro ao gerar código único. Tente novamente.' }, { status: 500 });
    }

    // 5. Calcular data de expiração (30 dias)
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + 30);

    // 6. Criar voucher
    const voucher = await base44.asServiceRole.entities.Voucher.create({
      code,
      workshop_id,
      company_id: company_id || null,
      consulting_firm_id: consulting_firm_id || null,
      seller_id: user.id,
      seller_name: user.full_name || user.email,
      discount_type,
      discount_percent: discount_type === 'percent' ? discount_percent : null,
      discount_value: discount_type === 'fixed' ? discount_value : null,
      max_uses,
      uses_count: 0,
      status: 'active',
      expiration_date: expirationDate.toISOString(),
      description: description || null,
      metadata: {
        created_by_role: user.role,
        created_at_month: currentMonth
      }
    });

    // 7. Atualizar contador mensal do vendedor
    if (rule) {
      const newCount = (rule.current_month === currentMonth) 
        ? (rule.vouchers_used_this_month || 0) + 1 
        : 1;
      
      await base44.asServiceRole.entities.VoucherSellerRule.update(rule.id, {
        vouchers_used_this_month: newCount,
        current_month: currentMonth
      });
    }

    // 8. Notificar admins globais
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const discountText = discount_type === 'percent' 
      ? `${discount_percent}%` 
      : `R$ ${discount_value?.toFixed(2)}`;

    for (const admin of admins.slice(0, 5)) {
      await base44.asServiceRole.entities.VoucherNotification.create({
        voucher_id: voucher.id,
        voucher_code: code,
        workshop_id,
        company_id: company_id || null,
        consulting_firm_id: consulting_firm_id || null,
        type: 'voucher_created',
        title: '🎟️ Novo Voucher Criado',
        message: `${user.full_name || user.email} criou o voucher ${code} com desconto de ${discountText}`,
        sent_to_user_id: admin.id,
        triggered_by_user_id: user.id,
        is_read: false,
        metadata: { discount_type, discount_percent, discount_value }
      });

      // Também cria na Notification geral para aparecer no sino
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        workshop_id,
        type: 'status_alterado',
        title: '🎟️ Novo Voucher Criado',
        message: `${user.full_name || user.email} criou o voucher ${code} com desconto de ${discountText}`,
        is_read: false,
        metadata: { voucher_id: voucher.id, voucher_code: code }
      });
    }

    return Response.json({
      success: true,
      voucher: {
        id: voucher.id,
        code,
        discount_type,
        discount_percent,
        discount_value,
        expiration_date: expirationDate.toISOString(),
        max_uses,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar voucher:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});