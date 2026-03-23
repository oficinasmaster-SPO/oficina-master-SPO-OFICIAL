import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, month, pessoa_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().substring(0, 7);

    // 1. Faturamento REAL (sem duplicação) = soma das vendas do mês
    const vendasMes = await base44.asServiceRole.entities.VendasServicos.filter({
      workshop_id: workshop_id,
      month: currentMonth
    });

    const faturamentoReal = vendasMes.reduce((sum, v) => sum + (v.valor_total || 0), 0);
    const faturamentoPecas = vendasMes.reduce((sum, v) => sum + (v.valor_pecas || 0), 0);
    const faturamentoServicos = vendasMes.reduce((sum, v) => sum + (v.valor_servicos || 0), 0);

    // 2. Performance por equipe/pessoa (crédito atribuído)
    const todasAtribuicoes = await base44.asServiceRole.entities.AtribuicoesVenda.filter({
      workshop_id: workshop_id
    });

    // Filtrar atribuições do mês
    const vendasIdsMes = vendasMes.map(v => v.id);
    const atribuicoesMes = todasAtribuicoes.filter(a => vendasIdsMes.includes(a.venda_id));

    // Agrupar por equipe
    const creditoPorEquipe = {};
    const creditoPorPessoa = {};

    for (const atrib of atribuicoesMes) {
      if (!creditoPorEquipe[atrib.equipe]) {
        creditoPorEquipe[atrib.equipe] = 0;
      }
      creditoPorEquipe[atrib.equipe] += atrib.valor_credito || 0;

      if (!creditoPorPessoa[atrib.pessoa_id]) {
        creditoPorPessoa[atrib.pessoa_id] = {
          nome: atrib.pessoa_nome,
          equipe: atrib.equipe,
          credito: 0
        };
      }
      creditoPorPessoa[atrib.pessoa_id].credito += atrib.valor_credito || 0;
    }

    // 3. Se pessoa_id foi informado, retornar apenas KPIs dessa pessoa
    if (pessoa_id) {
      const creditoPessoa = creditoPorPessoa[pessoa_id]?.credito || 0;
      
      return Response.json({
        success: true,
        month: currentMonth,
        pessoa: {
          id: pessoa_id,
          nome: creditoPorPessoa[pessoa_id]?.nome || '',
          credito_total: creditoPessoa,
          atribuicoes_count: atribuicoesMes.filter(a => a.pessoa_id === pessoa_id).length
        }
      });
    }

    // 4. Retornar KPIs gerais
    return Response.json({
      success: true,
      month: currentMonth,
      faturamento: {
        total: faturamentoReal,
        pecas: faturamentoPecas,
        servicos: faturamentoServicos,
        vendas_count: vendasMes.length
      },
      credito_por_equipe: creditoPorEquipe,
      credito_por_pessoa: Object.entries(creditoPorPessoa).map(([id, data]) => ({
        pessoa_id: id,
        ...data
      }))
    });

  } catch (error) {
    console.error("Erro ao calcular KPIs:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});