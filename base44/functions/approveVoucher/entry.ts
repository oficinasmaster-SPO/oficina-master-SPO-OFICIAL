import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem aprovar vouchers' }, { status: 403 });
    }

    const body = await req.json();
    const { voucher_use_id, action, approval_notes, rejection_reason, file_urls } = body;

    if (!voucher_use_id || !action) {
      return Response.json({ error: 'voucher_use_id e action são obrigatórios' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ error: 'action deve ser "approve" ou "reject"' }, { status: 400 });
    }

    // Buscar uso do voucher
    const uses = await base44.asServiceRole.entities.VoucherUse.filter({ id: voucher_use_id });
    if (!uses || uses.length === 0) {
      return Response.json({ error: 'Registro de uso não encontrado' }, { status: 404 });
    }
    const voucherUse = uses[0];

    if (voucherUse.status !== 'pending') {
      return Response.json({ error: `Este uso já foi ${voucherUse.status === 'approved' ? 'aprovado' : 'rejeitado'}` }, { status: 400 });
    }

    // Buscar voucher
    const vouchers = await base44.asServiceRole.entities.Voucher.filter({ id: voucherUse.voucher_id });
    const voucher = vouchers?.[0];

    const now = new Date();

    if (action === 'approve') {
      // Validações para aprovação
      if (!approval_notes || !approval_notes.trim()) {
        return Response.json({ error: 'Observações são obrigatórias para aprovação' }, { status: 400 });
      }

      if (!file_urls || !file_urls.payment_receipt) {
        return Response.json({ error: 'Upload do comprovante de pagamento é obrigatório para aprovação' }, { status: 400 });
      }

      if (!file_urls.contract) {
        return Response.json({ error: 'Upload do contrato é obrigatório para aprovação' }, { status: 400 });
      }

      // Salvar arquivos
      const fileRecords = [];

      // Comprovante de pagamento
      fileRecords.push({
        voucher_use_id: voucherUse.id,
        voucher_id: voucherUse.voucher_id,
        workshop_id: voucherUse.workshop_id,
        company_id: voucherUse.company_id || null,
        consulting_firm_id: voucherUse.consulting_firm_id || null,
        file_type: 'payment_receipt',
        file_url: file_urls.payment_receipt,
        file_name: file_urls.payment_receipt_name || 'comprovante_pagamento',
        uploaded_by: user.id,
        uploaded_by_name: user.full_name || user.email,
        notes: 'Comprovante de pagamento anexado na aprovação'
      });

      // Contrato
      fileRecords.push({
        voucher_use_id: voucherUse.id,
        voucher_id: voucherUse.voucher_id,
        workshop_id: voucherUse.workshop_id,
        company_id: voucherUse.company_id || null,
        consulting_firm_id: voucherUse.consulting_firm_id || null,
        file_type: 'contract',
        file_url: file_urls.contract,
        file_name: file_urls.contract_name || 'contrato',
        uploaded_by: user.id,
        uploaded_by_name: user.full_name || user.email,
        notes: 'Contrato anexado na aprovação'
      });

      // Outros arquivos opcionais
      if (file_urls.others && file_urls.others.length > 0) {
        for (const f of file_urls.others) {
          fileRecords.push({
            voucher_use_id: voucherUse.id,
            voucher_id: voucherUse.voucher_id,
            workshop_id: voucherUse.workshop_id,
            company_id: voucherUse.company_id || null,
            consulting_firm_id: voucherUse.consulting_firm_id || null,
            file_type: 'other',
            file_url: f.url,
            file_name: f.name || 'documento',
            uploaded_by: user.id,
            uploaded_by_name: user.full_name || user.email,
            notes: f.notes || null
          });
        }
      }

      // Criar registros de arquivos
      for (const rec of fileRecords) {
        await base44.asServiceRole.entities.VoucherFile.create(rec);
      }

      // Atualizar uso
      await base44.asServiceRole.entities.VoucherUse.update(voucherUse.id, {
        status: 'approved',
        approved_by: user.id,
        approved_by_name: user.full_name || user.email,
        approved_at: now.toISOString(),
        approval_notes: approval_notes.trim()
      });

      // Atualizar voucher
      if (voucher) {
        await base44.asServiceRole.entities.Voucher.update(voucher.id, {
          status: 'approved'
        });
      }

      // Notificar vendedor
      if (voucherUse.used_by_seller_id) {
        await base44.asServiceRole.entities.VoucherNotification.create({
          voucher_id: voucherUse.voucher_id,
          voucher_use_id: voucherUse.id,
          voucher_code: voucherUse.voucher_code,
          workshop_id: voucherUse.workshop_id,
          type: 'approved',
          title: '✅ Voucher Aprovado',
          message: `O uso do voucher ${voucherUse.voucher_code} para ${voucherUse.client_name} foi APROVADO por ${user.full_name || user.email}. Obs: ${approval_notes.trim()}`,
          sent_to_user_id: voucherUse.used_by_seller_id,
          triggered_by_user_id: user.id,
          is_read: false
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: voucherUse.used_by_seller_id,
          workshop_id: voucherUse.workshop_id,
          type: 'status_alterado',
          title: '✅ Voucher Aprovado',
          message: `Voucher ${voucherUse.voucher_code} aprovado para ${voucherUse.client_name} por ${user.full_name || user.email}.`,
          is_read: false
        });
      }

      return Response.json({
        success: true,
        action: 'approved',
        voucher_use_id: voucherUse.id,
        files_saved: fileRecords.length
      });

    } else {
      // REJEIÇÃO
      if (!rejection_reason || !rejection_reason.trim()) {
        return Response.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 });
      }

      // Atualizar uso
      await base44.asServiceRole.entities.VoucherUse.update(voucherUse.id, {
        status: 'rejected',
        approved_by: user.id,
        approved_by_name: user.full_name || user.email,
        approved_at: now.toISOString(),
        rejection_reason: rejection_reason.trim()
      });

      // Reverter uso no voucher
      if (voucher) {
        const newUsesCount = Math.max(0, (voucher.uses_count || 1) - 1);
        await base44.asServiceRole.entities.Voucher.update(voucher.id, {
          uses_count: newUsesCount,
          status: 'active' // Reativar para permitir novo uso
        });
      }

      // Notificar vendedor
      if (voucherUse.used_by_seller_id) {
        await base44.asServiceRole.entities.VoucherNotification.create({
          voucher_id: voucherUse.voucher_id,
          voucher_use_id: voucherUse.id,
          voucher_code: voucherUse.voucher_code,
          workshop_id: voucherUse.workshop_id,
          type: 'rejected',
          title: '❌ Voucher Rejeitado',
          message: `O uso do voucher ${voucherUse.voucher_code} para ${voucherUse.client_name} foi REJEITADO por ${user.full_name || user.email}. Motivo: ${rejection_reason.trim()}`,
          sent_to_user_id: voucherUse.used_by_seller_id,
          triggered_by_user_id: user.id,
          is_read: false
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: voucherUse.used_by_seller_id,
          workshop_id: voucherUse.workshop_id,
          type: 'status_alterado',
          title: '❌ Voucher Rejeitado',
          message: `Voucher ${voucherUse.voucher_code} rejeitado para ${voucherUse.client_name}. Motivo: ${rejection_reason.trim()}`,
          is_read: false
        });
      }

      return Response.json({
        success: true,
        action: 'rejected',
        voucher_use_id: voucherUse.id
      });
    }

  } catch (error) {
    console.error('Erro ao processar aprovação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});