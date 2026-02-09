import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInDays } from 'npm-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, item_id, item_nome, status, data_termino_real, data_termino_previsto, progresso_percentual } = await req.json();

    if (!workshop_id || !item_id) {
      return Response.json({ error: 'workshop_id e item_id são obrigatórios' }, { status: 400 });
    }

    let progressos = await base44.asServiceRole.entities.CronogramaProgresso.filter({
      workshop_id,
      modulo_codigo
    });

    const progresso = progressos[0];

    // Determinar situação com base em status, datas e progresso
    let situacao = 'nao_iniciado';
    
    if (status === 'concluido') {
      situacao = 'concluido';
    } else if (status === 'em_andamento') {
      // Verificar se está atrasado
      if (data_termino_previsto) {
        const diasRestantes = differenceInDays(new Date(data_termino_previsto), new Date());
        situacao = diasRestantes < 0 ? 'atrasado' : 'em_andamento';
      } else {
        situacao = 'em_andamento';
      }
    } else if (status === 'a_fazer' && progresso?.data_visualizacao) {
      // Se já foi visualizado mas não iniciado
      situacao = 'nao_iniciado';
    }

    const progressoData = {
      workshop_id,
      modulo_codigo,
      modulo_nome,
      situacao,
      data_conclusao_realizado === 'concluido' && data_termino_real ? data_termino_real.split('T')[0] ,
      data_visualizacao !== 'a_fazer' ? new Date().toISOString() ?.data_visualizacao || null,
      atividades_realizadas || 0,
      tipo_conteudo: 'processo',
      fase_oficina?.fase_oficina || 1
    };

    if (progresso?.id) {
      await base44.asServiceRole.entities.CronogramaProgresso.update(progresso.id, progressoData);
    } else {
      await base44.asServiceRole.entities.CronogramaProgresso.create(progressoData);
    }

    return Response.json({ success, situacao });

  } catch (error) {
    console.error('Erro ao sincronizar cronograma:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
