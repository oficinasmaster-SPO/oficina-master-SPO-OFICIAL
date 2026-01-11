import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza CronogramaImplementacao com CronogramaProgresso
 * Garante que ambas as entidades reflitam o mesmo estado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, item_id, item_nome, status, data_termino_real, progresso_percentual } = await req.json();

    if (!workshop_id || !item_id) {
      return Response.json({ error: 'workshop_id e item_id são obrigatórios' }, { status: 400 });
    }

    // Buscar ou criar registro em CronogramaProgresso
    let progresso = await base44.asServiceRole.entities.CronogramaProgresso.filter({
      workshop_id,
      modulo_codigo: item_id
    });

    progresso = progresso[0];

    // Mapear status
    const situacaoMap = {
      'a_fazer': 'nao_iniciado',
      'em_andamento': 'em_andamento',
      'concluido': 'concluido'
    };

    const situacao = situacaoMap[status] || 'nao_iniciado';

    // Verificar se está atrasado
    const isAtrasado = status !== 'concluido' && data_termino_real && new Date(data_termino_real) < new Date();
    const situacaoFinal = isAtrasado ? 'atrasado' : situacao;

    const progressoData = {
      workshop_id,
      modulo_codigo: item_id,
      modulo_nome: item_nome,
      situacao: situacaoFinal,
      data_conclusao_realizado: status === 'concluido' && data_termino_real ? data_termino_real.split('T')[0] : null,
      data_visualizacao: status !== 'a_fazer' ? new Date().toISOString() : null,
      atividades_realizadas: progresso_percentual || 0,
      tipo_conteudo: 'processo',
      fase_oficina: 1
    };

    if (progresso) {
      await base44.asServiceRole.entities.CronogramaProgresso.update(progresso.id, progressoData);
    } else {
      await base44.asServiceRole.entities.CronogramaProgresso.create(progressoData);
    }

    return Response.json({ success: true, message: 'Sincronização realizada com sucesso' });

  } catch (error) {
    console.error('Erro ao sincronizar cronograma:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});