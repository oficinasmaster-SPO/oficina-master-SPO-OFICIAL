import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const hoje = new Date();
    const hojeISO = hoje.toISOString().split('T')[0];
    const daqui30Dias = new Date(hoje);
    daqui30Dias.setDate(daqui30Dias.getDate() + 30);
    const daqui30DiasISO = daqui30Dias.toISOString().split('T')[0];

    // Buscar todas as recorrências ativas
    const recorrencias = await base44.entities.DRELancamento.filter({
      recorrencia_ativa: true
    });

    if (!recorrencias || recorrencias.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhuma recorrência ativa encontrada',
        alertas_gerados: 0 
      });
    }

    // Agrupar por recorrencia_id
    const gruposRecorrencia = {};
    recorrencias.forEach(lancamento => {
      if (!lancamento.recorrencia_id) return;
      
      if (!gruposRecorrencia[lancamento.recorrencia_id]) {
        gruposRecorrencia[lancamento.recorrencia_id] = {
          recorrencia_id: lancamento.recorrencia_id,
          descricao: lancamento.descricao,
          categoria: lancamento.categoria,
          valor: lancamento.valor,
          recorrencia_frequencia: lancamento.recorrencia_frequencia,
          recorrencia_data_inicio: lancamento.recorrencia_data_inicio,
          recorrencia_data_fim: lancamento.recorrencia_data_fim,
          recorrencia_dias_vencimento: lancamento.recorrencia_dias_vencimento,
          lancamentos: []
        };
      }
      gruposRecorrencia[lancamento.recorrencia_id].lancamentos.push(lancamento);
    });

    const alertas = [];

    // Verificar quais recorrências estão terminando em 30 dias
    for (const [recorrenciaId, grupo] of Object.entries(gruposRecorrencia)) {
      if (!grupo.recorrencia_data_fim) continue;

      const dataFim = new Date(grupo.recorrencia_data_fim);
      const dataFimISO = dataFim.toISOString().split('T')[0];

      // Se a data de fim está entre hoje e daqui 30 dias
      if (dataFimISO >= hojeISO && dataFimISO <= daqui30DiasISO) {
        const diasRestantes = Math.floor((dataFim - hoje) / (1000 * 60 * 60 * 24));
        
        // Buscar usuário responsável (criador da recorrência)
        const criadorEmail = grupo.lancamentos[0]?.created_by;
        let criadorUsuario = null;
        
        try {
          const usuarios = await base44.entities.User.filter({ email: criadorEmail });
          criadorUsuario = usuarios[0];
        } catch {
          // Usuário não encontrado
        }

        const alerta = {
          tipo: 'recorrencia_vencendo',
          recorrencia_id: recorrenciaId,
          descricao: grupo.descricao,
          categoria: grupo.categoria,
          valor: grupo.valor,
          data_fim: grupo.recorrencia_data_fim,
          dias_restantes: diasRestantes,
          usuario_email: criadorEmail
        };

        alertas.push(alerta);

        // Criar notificação
        if (criadorUsuario) {
          await base44.entities.Notification.create({
            user_id: criadorUsuario.id,
            title: `⏰ Recorrência Vencendo: ${grupo.descricao}`,
            message: `A recorrência "${grupo.descricao}" vence em ${diasRestantes} dias (${dataFim.toLocaleDateString('pt-BR')}). Valor: ${formatarMoeda(grupo.valor)}.`,
            type: 'alerta_recorrencia',
            metadata: {
              recorrencia_id: recorrenciaId,
              descricao: grupo.descricao,
              dias_restantes: diasRestantes,
              data_fim: grupo.recorrencia_data_fim
            }
          });

          // Enviar email
          try {
            await base44.integrations.Core.SendEmail({
              to: criadorUsuario.email,
              subject: `Recorrência Vencendo em ${diasRestantes} dias - ${grupo.descricao}`,
              body: `
                <h2>⏰ Recorrência Vencendo</h2>
                <p><strong>Descrição:</strong> ${grupo.descricao}</p>
                <p><strong>Categoria:</strong> ${grupo.categoria}</p>
                <p><strong>Valor:</strong> ${formatarMoeda(grupo.valor)}</p>
                <hr>
                <p><strong>Data de Término:</strong> ${dataFim.toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias Restantes:</strong> ${diasRestantes} dias</p>
                <hr>
                <p>Se desejar renovar esta recorrência, crie um novo lançamento ou estenda a data de término.</p>
              `
            });
          } catch (emailError) {
            console.error('Erro ao enviar email de alerta de recorrência:', emailError);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Verificação concluída. ${alertas.length} alerta(s) gerado(s)`,
      alertas_gerados: alertas.length,
      alertas,
      data_verificacao: hojeISO
    });

  } catch (error) {
    console.error('Erro ao verificar recorrências vencendo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};