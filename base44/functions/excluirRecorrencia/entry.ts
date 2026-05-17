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
      modo_exclusao
    } = body;

    if (!recorrencia_id && !lancamento_id) {
      return Response.json({ 
        error: 'recorrencia_id ou lancamento_id é obrigatório' 
      }, { status: 400 });
    }

    // Se tiver recorrencia_id, buscar todos os lançamentos da série
    let todosLancamentos = [];
    
    if (recorrencia_id) {
      todosLancamentos = await base44.entities.DRELancamento.filter({
        recorrencia_id
      });
    } else if (lancamento_id) {
      // Se só tiver lancamento_id, buscar o lançamento para descobrir o recorrencia_id
      const lancamento = await base44.entities.DRELancamento.get(lancamento_id);
      if (lancamento?.recorrencia_id) {
        todosLancamentos = await base44.entities.DRELancamento.filter({
          recorrencia_id: lancamento.recorrencia_id
        });
      } else {
        // É um lançamento único, excluir apenas ele
        await base44.entities.DRELancamento.delete(lancamento_id);
        return Response.json({
          success: true,
          total_excluido: 1,
          modo: 'unico',
          mensagem: 'Lançamento único excluído com sucesso!'
        });
      }
    }

    if (!todosLancamentos || todosLancamentos.length === 0) {
      return Response.json({ 
        error: 'Nenhum lançamento encontrado' 
      }, { status: 404 });
    }

    // Ordenar por parcela_atual
    todosLancamentos.sort((a, b) => a.parcela_atual - b.parcela_atual);

    // Determinar quais lançamentos excluir baseado no modo
    let lancamentosParaExcluir = [];

    switch (modo_exclusao) {
      case 'este_mes':
        // Apenas o lançamento específico
        const alvo = todosLancamentos.find(l => l.id === lancamento_id);
        if (!alvo) {
          return Response.json({ 
            error: 'Lançamento não encontrado' 
          }, { status: 404 });
        }
        lancamentosParaExcluir = [alvo];
        break;

      case 'futuro':
        // Este mês em diante (baseado na parcela do lançamento editado)
        const referencia = todosLancamentos.find(l => l.id === lancamento_id);
        if (!referencia) {
          return Response.json({ 
            error: 'Lançamento de referência não encontrado' 
          }, { status: 404 });
        }
        lancamentosParaExcluir = todosLancamentos.filter(
          l => l.parcela_atual >= referencia.parcela_atual
        );
        break;

      case 'todos':
        // Todos os lançamentos da recorrência
        lancamentosParaExcluir = todosLancamentos;
        break;

      default:
        return Response.json({ 
          error: 'modo_exclusao inválido. Use: este_mes, futuro, ou todos' 
        }, { status: 400 });
    }

    // Excluir lançamentos
    const excluidos = [];

    for (const lancamento of lancamentosParaExcluir) {
      await base44.entities.DRELancamento.delete(lancamento.id);
      excluidos.push({
        id: lancamento.id,
        mes: lancamento.mes,
        parcela: lancamento.parcela_atual
      });
    }

    return Response.json({
      success: true,
      total_excluido: excluidos.length,
      modo: modo_exclusao,
      lancamentos: excluidos,
      mensagem: `${excluidos.length} lançamento(s) excluído(s) com sucesso!`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});