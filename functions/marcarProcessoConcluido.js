import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, modulo_codigo, tipo_conteudo } = await req.json();

    if (!workshop_id || !modulo_codigo) {
      return Response.json({ error: 'workshop_id e modulo_codigo são obrigatórios' }, { status: 400 });
    }

    // Buscar o processo no cronograma
    const progressos = await base44.asServiceRole.entities.CronogramaProgresso.filter({
      workshop_id,
      modulo_codigo,
      tipo_conteudo || 'diagnostico'
    });

    if (progressos.length === 0) {
      return Response.json({ 
        message: 'Processo não encontrado no cronograma',
        created 
      });
    }

    const processo = progressos[0];

    // Marcar como concluído
    await base44.asServiceRole.entities.CronogramaProgresso.update(processo.id, {
      situacao: 'concluido',
      data_conclusao_realizado Date().toISOString().split('T')[0],
      atividades_realizadas.atividades_previstas || 1
    });

    return Response.json({
      success,
      message: 'Processo marcado como concluído automaticamente',
      processo_id.id
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
