import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESEND_THRESHOLD_DAYS = 3;  // Reenviar se convite enviado há mais de 3 dias e ainda não acessado
const EXPIRY_DAYS = 7;            // Convite expira em 7 dias

Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Buscar todos os convites ainda ativos
    const activeInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({
      status: { $in: ['enviado', 'acessado'] }
    }, '-created_date', 500);

    const total_found = (activeInvites || []).length;
    let expired = 0;
    let resent = 0;
    let errors = 0;
    let updated = 0;

    for (const invite of (activeInvites || [])) {
      const createdAt = new Date(invite.created_date);
      const ageMs = now - createdAt;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      // 1. Expirar convites com mais de 7 dias
      if (invite.expires_at && invite.expires_at < now.toISOString()) {
        try {
          await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, { status: 'expirado' });
          expired++;
          updated++;
        } catch (e) {
          console.error(`Erro ao expirar convite ${invite.id}:`, e.message);
          errors++;
        }
        continue;
      }

      // 2. Reenviar convites com status 'enviado' há mais de 3 dias (mas ainda dentro dos 7 dias)
      if (
        invite.status === 'enviado' &&
        ageDays >= RESEND_THRESHOLD_DAYS &&
        ageDays < EXPIRY_DAYS &&
        (invite.resent_count || 0) < 1  // Reenviar no máximo 1 vez automaticamente
      ) {
        try {
          // Reenviar e-mail de convite usando a função existente
          await base44.functions.invoke('resendEmployeeInvite', { invite_id: invite.id });

          await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
            resent_count: (invite.resent_count || 0) + 1,
            last_resent_at: now.toISOString()
          });

          console.log(`📧 Convite reenviado automaticamente: ${invite.email} (${Math.round(ageDays)} dias sem ativar)`);
          resent++;
          updated++;
        } catch (e) {
          console.error(`Erro ao reenviar convite ${invite.id}:`, e.message);
          errors++;
        }
      }
    }

    console.log(`✅ Expirados: ${expired} | Reenviados: ${resent} | Erros: ${errors}`);

    // Tracking de execução
    const duration_ms = Date.now() - startTime;
    try {
      await base44.asServiceRole.entities.SystemEventLog.create({
        event_type: 'FUNCTION_EXECUTED',
        entity_type: 'EmployeeInvite',
        triggered_by: 'automation',
        status: errors > 0 ? 'warning' : 'success',
        details: {
          function_name: 'cleanupExpiredInvites',
          processed_count: updated,
          error_count: errors,
          duration_ms,
          total_found,
          updated,
          errors,
          expired,
          resent
        },
        timestamp: new Date().toISOString()
      });
    } catch (_) {}

    return Response.json({
      success: true,
      expired,
      resent,
      errors
    });

  } catch (error) {
    console.error('❌ Erro na limpeza de convites:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});