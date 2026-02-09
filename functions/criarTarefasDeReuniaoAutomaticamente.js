import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id required' }, { status: 400 });
    }

    // Buscar o atendimento
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);

    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Se não tem próximos passos ou decisões, não cria tarefas
    if (!atendimento.proximos_passos || atendimento.proximos_passos.length === 0) {
      return Response.json({ 
        success, 
        message: 'Nenhum próximo passo para criar tarefas' 
      });
    }

    // Criar uma tarefa para cada próximo passo
    const tarefasCriadas = [];
    
    for (const passo of atendimento.proximos_passos) {
      try {
        const novaTarefa = await base44.entities.TarefaBacklog.create({
          cliente_id.workshop_id,
          cliente_nome.workshop_id, // Será preenchido com nome real
          consultor_id.consultor_id,
          consultor_nome.consultor_nome,
          titulo.decisao || 'Tarefa gerada automaticamente',
          descricao: `Gerada automaticamente a partir do atendimento: ${atendimento.tipo_atendimento}`,
          origem: 'reuniao',
          origem_id,
          prazo.prazo || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          prioridade: 'media',
          status: 'aberta',
          tempo_estimado_horas: 2, // Padrão de 2 horas
          notas: `Responsável: ${passo.responsavel || 'A definir'}`
        });
        
        tarefasCriadas.push(novaTarefa);
      } catch (err) {
        console.error('Erro ao criar tarefa:', err);
      }
    }

    return Response.json({
      success,
      tarefas_criadas.length,
      message: `${tarefasCriadas.length} tarefa(s) criada(s) automaticamente`
    });

  } catch (error) {
    console.error('Erro na função:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
