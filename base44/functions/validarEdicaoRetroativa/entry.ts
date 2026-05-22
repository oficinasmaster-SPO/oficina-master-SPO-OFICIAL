import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mes, workshop_id, entidade, entidade_id } = await req.json();

    // Validações
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return Response.json({ error: 'Mês inválido' }, { status: 400 });
    }

    if (!workshop_id) {
      return Response.json({ error: 'Workshop ID obrigatório' }, { status: 400 });
    }

    if (!entidade || !['DRELancamento', 'DFCLancamento', 'BudgetMeta', 'ContaReceber', 'ContaPagar'].includes(entidade)) {
      return Response.json({ error: 'Entidade inválida' }, { status: 400 });
    }

    // Verifica se mês está fechado
    const snapshot = await base44.entities.FinancialMonthSnapshot.filter({
      workshop_id,
      mes,
      status: 'fechado'
    });

    const mesFechado = snapshot.length > 0;

    if (!mesFechado) {
      // Mês aberto → permite edição
      return Response.json({
        permitido: true,
        motivo: 'Mês aberto para edições'
      });
    }

    // Mês fechado → verifica permissões
    if (user.role !== 'admin') {
      return Response.json({
        permitido: false,
        motivo: 'Mês fechado. Apenas administradores podem editar.',
        snapshot_id: snapshot[0].id,
        data_fechamento: snapshot[0].data_fechamento,
        fechado_por: snapshot[0].fechado_por_nome
      }, { status: 403 });
    }

    // Admin pode editar, mas precisa de justificativa
    return Response.json({
      permitido: true,
      motivo: 'Admin pode editar com justificativa',
      requer_justificativa: true,
      snapshot_id: snapshot[0].id,
      data_fechamento: snapshot[0].data_fechamento,
      fechado_por: snapshot[0].fechado_por_nome,
      aviso: 'Esta edição será registrada em auditoria e requer justificativa'
    });

  } catch (error) {
    console.error('Erro ao validar edição retroativa:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});