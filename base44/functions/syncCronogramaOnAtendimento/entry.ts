import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { atendimento_id, atendimento_data } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id é obrigatório' }, { status: 400 });
    }

    // Buscar atendimento completo
    const atendimento = atendimento_data || await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Verificar se atendimento foi realizado
    if (!['realizado', 'concluido'].includes(atendimento.status)) {
      return Response.json({ 
        message: 'Atendimento não foi realizado/concluído, nenhuma atualização necessária',
        status: atendimento.status
      });
    }

    const workshop_id = atendimento.workshop_id;
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id não encontrado no atendimento' }, { status: 400 });
    }

    // Buscar todos os items do cronograma dessa oficina
    const cronogramaItems = await base44.entities.CronogramaImplementacao.filter(
      { workshop_id },
      '-updated_date',
      100
    );

    if (!cronogramaItems || cronogramaItems.length === 0) {
      return Response.json({ 
        message: 'Nenhum item de cronograma encontrado para sincronizar',
        updated: 0
      });
    }

    // Correlacionar atendimento com item do cronograma
    // Buscar por: tipo de atendimento, data, ou referência direta
    const itemsParaAtualizar = cronogramaItems.filter(item => {
      // Critério 1: Tipo de atendimento corresponde ao item_tipo
      const tipoMatch = item.item_tipo && atendimento.tipo_atendimento && 
        item.item_tipo.toLowerCase().includes(atendimento.tipo_atendimento.toLowerCase());
      
      // Critério 2: Data do atendimento próxima à data prevista do item
      const dataAtendimento = new Date(atendimento.data_agendada || atendimento.data_realizada);
      const dataItem = new Date(item.data_termino_previsto);
      const diasDiferenca = Math.abs((dataAtendimento - dataItem) / (1000 * 60 * 60 * 24));
      const dataMatch = diasDiferenca <= 7; // Até 7 dias de diferença
      
      // Critério 3: Item ainda não foi completamente finalizado e status permite atualização
      const statusMatch = item.status !== 'concluido';

      return (tipoMatch || dataMatch) && statusMatch;
    });

    let updatedCount = 0;
    const updatedItems = [];

    for (const item of itemsParaAtualizar) {
      try {
        const dataAtendimento = new Date(atendimento.data_realizada || atendimento.data_agendada);
        
        // Calcular datas baseado no atendimento realizado
        const atualizacoes = {
          status: 'em_andamento', // Item agora em andamento
          data_inicio_real: item.data_inicio_real || dataAtendimento.toISOString(),
          progresso_percentual: Math.max(item.progresso_percentual || 0, 50), // Mínimo 50% após atendimento
          historico_alteracoes: [
            ...(item.historico_alteracoes || []),
            {
              data_alteracao: new Date().toISOString(),
              campo_alterado: 'sincronizacao_atendimento',
              valor_anterior: `status: ${item.status}`,
              valor_novo: `status: em_andamento - Atendimento realizado em ${dataAtendimento.toLocaleDateString('pt-BR')}`,
              usuario_id: 'sistema',
              usuario_nome: 'Sistema Automático'
            }
          ]
        };

        await base44.entities.CronogramaImplementacao.update(item.id, atualizacoes);
        updatedCount++;
        updatedItems.push({
          id: item.id,
          nome: item.item_nome,
          statusAnterior: item.status,
          statusNovo: 'em_andamento'
        });
      } catch (itemError) {
        console.error(`Erro ao atualizar item ${item.id}:`, itemError.message);
      }
    }

    return Response.json({
      success: true,
      message: `${updatedCount} item(ns) do cronograma atualizado(s)`,
      updated: updatedCount,
      updatedItems,
      atendimento: {
        id: atendimento.id,
        workshop_id,
        tipo: atendimento.tipo_atendimento,
        data_realizada: atendimento.data_realizada || atendimento.data_agendada
      }
    });

  } catch (error) {
    console.error('Erro em syncCronogramaOnAtendimento:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});