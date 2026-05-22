import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Backfill: Cria ContaReceber e Liquidações históricas a partir do DRE
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas admin' }, { status: 403 });

    const { workshop_id, meses, criarLiquidacao } = await req.json();
    
    if (!workshop_id || !meses || !Array.isArray(meses)) {
      return Response.json({ error: 'workshop_id e meses (array) obrigatórios' }, { status: 400 });
    }

    const resultados = {
      contas_receber_criadas: 0,
      contas_pagar_criadas: 0,
      liquidacoes_criadas: 0,
      erros: []
    };

    for (const mes of meses) {
      // Busca DRE do mês
      const dreLancamentos = await base44.entities.DRELancamento.filter({
        workshop_id,
        mes
      });

      // Cria ContaReceber para receitas
      const receitas = dreLancamentos.filter(l => l.tipo === 'receita');
      for (const receita of receitas) {
        try {
          // Verifica se já existe
          const existente = await base44.entities.ContaReceber.filter({
            workshop_id,
            dre_lancamento_id: receita.id
          });

          if (existente.length > 0) continue;

          await base44.entities.ContaReceber.create({
            workshop_id,
            dre_lancamento_id: receita.id,
            cliente_id: 'cliente_historico_' + workshop_id,
            cliente_nome: 'Cliente Histórico',
            valor_original: receita.valor,
            valor_aberto: 0,
            valor_pago: receita.valor,
            status: 'pago',
            data_vencimento: receita.data_vencimento || `${mes}-10`,
            data_emissao: `${mes}-01`,
            data_primeiro_pagamento: `${mes}-15`,
            forma_pagamento: 'pix',
            parcela_numero: 1,
            parcela_total: 1
          });

          resultados.contas_receber_criadas++;

          // Cria liquidação se solicitado
          if (criarLiquidacao) {
            await base44.entities.LiquidacaoFinanceira.create({
              workshop_id,
              conta_receber_id: 'rec_' + Date.now(),
              tipo: 'recebimento',
              valor_liquidacao: receita.valor,
              data_liquidacao: `${mes}-15T10:00:00`,
              forma_pagamento: 'pix',
              valor_liquido: receita.valor,
              conciliado: false
            });
            resultados.liquidacoes_criadas++;
          }
        } catch (error) {
          resultados.erros.push({ mes, tipo: 'receita', error: error.message });
        }
      }

      // Cria ContaPagar para despesas
      const despesas = dreLancamentos.filter(l => l.tipo === 'despesa');
      for (const despesa of despesas) {
        try {
          const existente = await base44.entities.ContaPagar.filter({
            workshop_id,
            dre_lancamento_id: despesa.id
          });

          if (existente.length > 0) continue;

          await base44.entities.ContaPagar.create({
            workshop_id,
            dre_lancamento_id: despesa.id,
            fornecedor_id: 'fornecedor_historico_' + workshop_id,
            fornecedor_nome: 'Fornecedor Histórico',
            valor_original: despesa.valor,
            valor_aberto: 0,
            valor_pago: despesa.valor,
            status: 'pago',
            data_vencimento: despesa.data_vencimento || `${mes}-10`,
            data_emissao: `${mes}-01`,
            forma_pagamento: 'ted',
            parcela_numero: 1,
            parcela_total: 1,
            categoria: despesa.categoria
          });

          resultados.contas_pagar_criadas++;

          if (criarLiquidacao) {
            await base44.entities.LiquidacaoFinanceira.create({
              workshop_id,
              conta_pagar_id: 'pay_' + Date.now(),
              tipo: 'pagamento',
              valor_liquidacao: despesa.valor,
              data_liquidacao: `${mes}-15T10:00:00`,
              forma_pagamento: 'ted',
              conciliado: false
            });
            resultados.liquidacoes_criadas++;
          }
        } catch (error) {
          resultados.erros.push({ mes, tipo: 'despesa', error: error.message });
        }
      }
    }

    return Response.json({
      success: true,
      ...resultados,
      resumo: `Criadas ${resultados.contas_receber_criadas} ContasReceber, ${resultados.contas_pagar_criadas} ContasPagar, ${resultados.liquidacoes_criadas} Liquidações`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});