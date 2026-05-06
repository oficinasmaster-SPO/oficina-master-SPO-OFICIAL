import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduler: verifica próximos passos com prazo vencido
 * e atualiza status para "atrasado" + cria notificação.
 * Roda via automação scheduled (ex: todo dia às 08:00).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Aceita chamada tanto autenticada (admin) quanto via scheduled automation
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca passos com prazo vencido que ainda não estão finalizados/cancelados/atrasados
    const ativos = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
      status: 'pendente'
    }, '-prazo', 1000);

    const emAndamento = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
      status: 'em_andamento'
    }, '-prazo', 1000);

    const aguardandoCliente = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
      status: 'aguardando_cliente'
    }, '-prazo', 1000);

    const candidatos = [...ativos, ...emAndamento, ...aguardandoCliente];

    const agora = new Date().toISOString();
    let marcadosAtrasado = 0;
    let notificacoesCriadas = 0;

    for (const passo of candidatos) {
      if (!passo.prazo) continue;

      const prazoDate = new Date(passo.prazo);
      prazoDate.setHours(23, 59, 59, 999);

      if (prazoDate < today) {
        // Marcar como atrasado
        const historicoAtual = passo.historico || [];
        await base44.asServiceRole.entities.ConsultoriaProximoPasso.update(passo.id, {
          status: 'atrasado',
          historico: [...historicoAtual, {
            tipo: 'status_alterado',
            descricao: 'Status alterado automaticamente para "Atrasado" por vencimento de prazo',
            de: passo.status,
            para: 'atrasado',
            usuario_nome: 'Sistema',
            created_at: agora,
          }]
        });
        marcadosAtrasado++;

        // Criar notificação para o consultor
        if (passo.consultor_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: passo.consultor_id,
            workshop_id: passo.workshop_id,
            type: 'processo_atrasado',
            title: '⚠️ Próximo passo atrasado',
            message: `O próximo passo "${passo.titulo}" está com prazo vencido${passo.responsavel_nome ? ` (Responsável: ${passo.responsavel_nome})` : ''}.`,
            is_read: false,
            metadata: { proximo_passo_id: passo.id }
          });
          notificacoesCriadas++;
        }
      }
    }

    return Response.json({
      success: true,
      candidatos: candidatos.length,
      marcadosAtrasado,
      notificacoesCriadas,
      executadoEm: agora,
    });
  } catch (error) {
    console.error('[checkProximosPassosOverdue] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});