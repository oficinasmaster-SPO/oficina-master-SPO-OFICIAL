import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { atendimento_id, contract_id } = await req.json();

    if (!atendimento_id || !contract_id) {
      return Response.json({ error: 'atendimento_id e contract_id required' }, { status: 400 });
    }

    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    const contrato = await base44.entities.Contract.get(contract_id);
    if (!contrato) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Calcular data de fim do contrato
    const dataInicio = new Date(contrato.start_date);
    const dataFim = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + contrato.contract_duration_months, dataInicio.getDate());
    const dataAtual = new Date();

    // Calcular quantas semanas faltam até o fim do contrato
    const diasRestantes = Math.floor((dataFim - dataAtual) / (1000 * 60 * 60 * 24));
    const semanasRestantes = Math.ceil(diasRestantes / 7);

    if (semanasRestantes <= 0) {
      return Response.json({ 
        success: true, 
        tarefas_criadas: 0,
        message: 'Contrato já finalizou. Nenhum follow-up criado.' 
      });
    }

    const tarefasCriadas = [];

    // Criar tarefa de follow-up para cada semana restante
    for (let i = 1; i <= semanasRestantes; i++) {
      try {
        const prazoDate = new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000));
        const prazo = prazoDate.toISOString().split('T')[0];

        const novaTarefa = await base44.entities.TarefaBacklog.create({
          cliente_id: atendimento.workshop_id,
          cliente_nome: atendimento.workshop_id,
          consultor_id: atendimento.consultor_id,
          consultor_nome: atendimento.consultor_nome,
          titulo: `Follow-up semanal - Semana ${i}`,
          descricao: `Contato telefônico para acompanhar progresso do cliente`,
          origem: 'reuniao',
          origem_id: atendimento_id,
          prazo: prazo,
          prioridade: 'media',
          status: 'aberta',
          tempo_estimado_horas: 0.5,
          notas: 'Ligação para check-in / acompanhamento de progresso'
        });
        
        tarefasCriadas.push(novaTarefa);
      } catch (err) {
        console.error('Erro ao criar tarefa:', err);
      }
    }

    return Response.json({
      success: true,
      tarefas_criadas: tarefasCriadas.length,
      semanas_totais: semanasRestantes,
      data_fim_contrato: contrato.end_date,
      message: `${tarefasCriadas.length} follow-up(s) semanal(is) criado(s) até ${contrato.end_date}`
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});