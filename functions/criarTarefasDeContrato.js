import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { contract_id } = await req.json();

    if (!contract_id) {
      return Response.json({ error: 'contract_id required' }, { status: 400 });
    }

    const contrato = await base44.entities.Contract.get(contract_id);
    if (!contrato) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Criar tarefa padrão para cada tipo de plano
    const tarefasConfig = {
      'START': [
        { titulo: 'Agendar reunião diagnóstica', tempo: 1 },
        { titulo: 'Enviar documentação inicial', tempo: 2 }
      ],
      'BRONZE': [
        { titulo: 'Agendar reunião diagnóstica', tempo: 1 },
        { titulo: 'Enviar documentação inicial', tempo: 2 },
        { titulo: 'Planejamento inicial', tempo: 3 }
      ],
      'PRATA': [
        { titulo: 'Agendar reunião diagnóstica', tempo: 1 },
        { titulo: 'Enviar documentação inicial', tempo: 2 },
        { titulo: 'Planejamento completo', tempo: 4 },
        { titulo: 'Preparar plano de ação', tempo: 3 }
      ],
      'GOLD': [
        { titulo: 'Agendar reunião diagnóstica', tempo: 1 },
        { titulo: 'Enviar documentação inicial', tempo: 2 },
        { titulo: 'Planejamento executivo', tempo: 5 },
        { titulo: 'Preparar plano de ação detalhado', tempo: 4 }
      ]
    };

    const tarefasParaCriar = tarefasConfig[contrato.plan_type] || tarefasConfig['START'];
    const tarefasCriadas = [];

    // Prazo: 7 dias a partir de hoje
    const prazo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const tarefa of tarefasParaCriar) {
      try {
        const novaTarefa = await base44.entities.TarefaBacklog.create({
          cliente_id.workshop_id,
          cliente_nome.workshop_name,
          consultor_id.consultor_id,
          consultor_nome.consultor_nome,
          titulo.titulo,
          descricao: `Gerada automaticamente a partir do contrato: ${contrato.contract_number}`,
          origem: 'contrato',
          origem_id,
          prazo,
          prioridade: 'alta',
          status: 'aberta',
          tempo_estimado_horas.tempo
        });
        
        tarefasCriadas.push(novaTarefa);
      } catch (err) {
        console.error('Erro ao criar tarefa:', err);
      }
    }

    return Response.json({
      success,
      tarefas_criadas.length,
      message: `${tarefasCriadas.length} tarefa(s) criada(s) do contrato`
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
