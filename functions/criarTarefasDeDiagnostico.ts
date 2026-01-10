import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { atendimento_id } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id required' }, { status: 400 });
    }

    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento || atendimento.tipo_atendimento !== 'diagnóstico') {
      return Response.json({ error: 'Atendimento de diagnóstico não encontrado' }, { status: 404 });
    }

    const tarefasCriadas = [];

    // Criar tarefas a partir dos próximos passos documentados
    if (atendimento.proximos_passos && atendimento.proximos_passos.length > 0) {
      for (const passo of atendimento.proximos_passos) {
        try {
          const novaTarefa = await base44.entities.TarefaBacklog.create({
            cliente_id: atendimento.workshop_id,
            cliente_nome: atendimento.workshop_id,
            consultor_id: atendimento.consultor_id,
            consultor_nome: atendimento.consultor_nome,
            titulo: passo.decisao || 'Ação de diagnóstico',
            descricao: `Próximo passo do diagnóstico realizado em ${new Date(atendimento.data_agendada).toLocaleDateString('pt-BR')}`,
            origem: 'diagnostico',
            origem_id: atendimento_id,
            prazo: passo.prazo || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            prioridade: 'alta',
            status: 'aberta',
            tempo_estimado_horas: 2,
            notas: `Responsável: ${passo.responsavel || 'Cliente'}`
          });
          
          tarefasCriadas.push(novaTarefa);
        } catch (err) {
          console.error('Erro ao criar tarefa:', err);
        }
      }
    }

    return Response.json({
      success: true,
      tarefas_criadas: tarefasCriadas.length,
      message: `${tarefasCriadas.length} tarefa(s) de diagnóstico criada(s)`
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});