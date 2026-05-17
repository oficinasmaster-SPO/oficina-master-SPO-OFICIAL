import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      recorrencia_id,
      lancamento_id,
      modo_edicao,
      dados_atualizados
    } = body;

    if (!recorrencia_id) {
      return Response.json({ 
        error: 'recorrencia_id é obrigatório' 
      }, { status: 400 });
    }

    // Buscar todos os lançamentos com este recorrencia_id
    const todosLancamentos = await base44.entities.DRELancamento.filter({
      recorrencia_id
    });

    if (!todosLancamentos || todosLancamentos.length === 0) {
      return Response.json({ 
        error: 'Nenhum lançamento encontrado com este recorrencia_id' 
      }, { status: 404 });
    }

    // Ordenar por parcela_atual
    todosLancamentos.sort((a, b) => a.parcela_atual - b.parcela_atual);

    // Determinar quais lançamentos atualizar baseado no modo
    let lancamentosParaAtualizar = [];

    switch (modo_edicao) {
      case 'este_mes':
        // Apenas o lançamento específico
        const alvo = todosLancamentos.find(l => l.id === lancamento_id);
        if (!alvo) {
          return Response.json({ 
            error: 'Lançamento não encontrado' 
          }, { status: 404 });
        }
        lancamentosParaAtualizar = [alvo];
        break;

      case 'futuro':
        // Este mês em diante (baseado na parcela do lançamento editado)
        const referencia = todosLancamentos.find(l => l.id === lancamento_id);
        if (!referencia) {
          return Response.json({ 
            error: 'Lançamento de referência não encontrado' 
          }, { status: 404 });
        }
        lancamentosParaAtualizar = todosLancamentos.filter(
          l => l.parcela_atual >= referencia.parcela_atual
        );
        break;

      case 'todos':
        // Todos os lançamentos da recorrência
        lancamentosParaAtualizar = todosLancamentos;
        break;

      default:
        return Response.json({ 
          error: 'modo_edicao inválido. Use: este_mes, futuro, ou todos' 
        }, { status: 400 });
    }

    // Atualizar lançamentos
    const atualizados = [];

    for (const lancamento of lancamentosParaAtualizar) {
      const atualizacao = { ...dados_atualizados };

      // Se estiver editando todos ou futuro, manter o recorrencia_id
      // Se for este_mes, remover recorrencia_id (vira lançamento único)
      if (modo_edicao === 'este_mes') {
        atualizacao.recorrencia_id = null;
        atualizacao.frequencia = 'unico';
      }

      await base44.entities.DRELancamento.update(lancamento.id, atualizacao);
      atualizados.push({
        id: lancamento.id,
        mes: lancamento.mes,
        parcela: lancamento.parcela_atual
      });
    }

    return Response.json({
      success: true,
      total_atualizado: atualizados.length,
      modo: modo_edicao,
      lancamentos: atualizados,
      mensagem: `${atualizados.length} lançamento(s) atualizado(s) com sucesso!`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});