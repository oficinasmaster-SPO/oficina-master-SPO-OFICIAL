import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lancamento_ids, recorrencia_id } = body;

    let idsParaExcluir = [];

    // Se tiver recorrencia_id, buscar todos os lançamentos da série
    if (recorrencia_id) {
      const todos = await base44.entities.DRELancamento.filter({
        recorrencia_id
      });
      idsParaExcluir = todos.map(l => l.id);
    } 
    // Se tiver array de IDs, usar diretamente
    else if (lancamento_ids && Array.isArray(lancamento_ids)) {
      idsParaExcluir = lancamento_ids;
    } 
    else {
      return Response.json({ 
        error: 'Forneça recorrencia_id ou lancamento_ids' 
      }, { status: 400 });
    }

    if (idsParaExcluir.length === 0) {
      return Response.json({ 
        success: true,
        total_excluido: 0,
        mensagem: 'Nenhum lançamento para excluir'
      });
    }

    // Excluir em lote
    let excluidos = 0;
    const erros = [];

    for (const id of idsParaExcluir) {
      try {
        await base44.entities.DRELancamento.delete(id);
        excluidos++;
      } catch (error) {
        erros.push({ id, erro: error.message });
      }
    }

    if (erros.length > 0) {
      return Response.json({
        success: true,
        parcial: true,
        total_excluido: excluidos,
        total_erros: erros.length,
        erros,
        mensagem: `${excluidos} excluído(s), ${erros.length} erro(s)`
      }, { status: 207 });
    }

    return Response.json({
      success: true,
      total_excluido: excluidos,
      mensagem: `${excluidos} lançamento(s) excluído(s) com sucesso!`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});