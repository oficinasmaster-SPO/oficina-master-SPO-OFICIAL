import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { processo_id } = await req.json();

    if (!processo_id) {
      return Response.json({ error: 'processo_id é obrigatório' }, { status: 400 });
    }

    // Buscar o processo
    const processos = await base44.entities.CronogramaProgresso.filter({ id: processo_id });
    const processo = processos[0];

    if (!processo) {
      return Response.json({ error: 'Processo não encontrado' }, { status: 404 });
    }

    // Verificar se já foi visualizado
    if (processo.data_visualizacao) {
      return Response.json({ 
        message: 'Processo já foi visualizado anteriormente',
        data_visualizacao: processo.data_visualizacao 
      });
    }

    // Registrar visualização e iniciar processo automaticamente
    const dataAtual = new Date();
    await base44.asServiceRole.entities.CronogramaProgresso.update(processo_id, {
      data_visualizacao: dataAtual.toISOString(),
      data_inicio_realizado: dataAtual.toISOString().split('T')[0],
      situacao: processo.situacao === 'nao_iniciado' ? 'em_andamento' : processo.situacao,
      notificacao_diaria_ativa: true
    });

    return Response.json({
      success: true,
      message: 'Visualização registrada e processo iniciado automaticamente',
      data_inicio_realizado: dataAtual.toISOString().split('T')[0]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});