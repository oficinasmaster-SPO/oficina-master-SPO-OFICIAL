import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backfill: Reprocessar Saldos Históricos do DFC
 * 
 * Esta função recalcula todos os saldos iniciais e finais do DFC
 * com base nas liquidações financeiras já registradas.
 * 
 * Use caso: Migração de dados, correção de inconsistências, ou
 * após mudanças na lógica de cálculo de saldos.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workshop_id, mes_inicio, mes_fim, dry_run = true } = await req.json();

    if (!workshop_id || !mes_inicio || !mes_fim) {
      return Response.json({ 
        error: 'Missing required fields: workshop_id, mes_inicio, mes_fim' 
      }, { status: 400 });
    }

    console.log(`[BACKFILL SALDOS] Workshop: ${workshop_id}, Período: ${mes_inicio} até ${mes_fim}, Dry run: ${dry_run}`);

    const resultados = {
      workshop_id,
      mes_inicio,
      mes_fim,
      dry_run,
      processados: 0,
      alterados: 0,
      erros: [],
      detalhes: []
    };

    // Buscar todos os DFCLancamentos do período (grupo=saldo_inicial)
    const dfcLancamentos = await base44.entities.DFCLancamento.filter({
      workshop_id,
      mes: { $gte: mes_inicio, $lte: mes_fim },
      grupo: 'saldo_inicial'
    });

    console.log(`[BACKFILL SALDOS] Encontrados ${dfcLancamentos.length} registros de saldo inicial`);

    // Processar mês a mês em ordem cronológica
    dfcLancamentos.sort((a, b) => a.mes.localeCompare(b.mes));

    let saldo_final_anterior = { bancos: 0, maquinas: 0, caixa: 0, total: 0 };

    for (const dfc of dfcLancamentos) {
      try {
        const mes = dfc.mes;
        console.log(`[BACKFILL SALDOS] Processando mês: ${mes}`);

        // 1. Buscar liquidações do mês
        const liquidacoesRecebimento = await base44.entities.LiquidaçãoFinanceira.filter({
          workshop_id,
          tipo: 'recebimento',
          data_liquidacao: { $gte: `${mes}-01`, $lt: `${mes}-31T23:59:59` }
        });

        const liquidacoesPagamento = await base44.entities.LiquidaçãoFinanceira.filter({
          workshop_id,
          tipo: 'pagamento',
          data_liquidacao: { $gte: `${mes}-01`, $lt: `${mes}-31T23:59:59` }
        });

        // 2. Calcular totais por fonte
        const totalRecebimentos = {
          banco: liquidacoesRecebimento
            .filter(l => l.banco_destino && l.banco_destino.toLowerCase().includes('banco'))
            .reduce((sum, l) => sum + (l.valor_liquido || l.valor_liquidacao), 0),
          maquina: liquidacoesRecebimento
            .filter(l => l.forma_pagamento && ['cartao_credito', 'cartao_debito'].includes(l.forma_pagamento))
            .reduce((sum, l) => sum + (l.valor_liquido || l.valor_liquidacao), 0),
          caixa: liquidacoesRecebimento
            .filter(l => l.forma_pagamento === 'dinheiro')
            .reduce((sum, l) => sum + (l.valor_liquido || l.valor_liquidacao), 0)
        };

        const totalPagamentos = {
          banco: liquidacoesPagamento
            .filter(l => l.banco_origem && l.banco_origem.toLowerCase().includes('banco'))
            .reduce((sum, l) => sum + (l.valor_liquidacao), 0),
          maquina: 0, // Máquina de cartão não é fonte de pagamento
          caixa: liquidacoesPagamento
            .filter(l => l.forma_pagamento === 'dinheiro')
            .reduce((sum, l) => sum + (l.valor_liquidacao), 0)
        };

        // 3. Calcular saldo final do mês anterior (ou usar inicial se for primeiro mês)
        const saldoInicialEsperado = {
          bancos: dfc.detalhes?.bancos?.reduce((sum, b) => sum + (b.saldo || 0), 0) || 0,
          maquinas: dfc.detalhes?.maquinas_cartao?.reduce((sum, m) => sum + (m.saldo || 0), 0) || 0,
          caixa: dfc.detalhes?.caixa || 0
        };

        // 4. Calcular saldo final projetado
        const saldoFinalProjetado = {
          bancos: saldo_final_anterior.bancos + totalRecebimentos.banco - totalPagamentos.banco,
          maquinas: saldo_final_anterior.maquinas + totalRecebimentos.maquina,
          caixa: saldo_final_anterior.caixa + totalRecebimentos.caixa - totalPagamentos.caixa
        };

        saldoFinalProjetado.total = saldoFinalProjetado.bancos + saldoFinalProjetado.maquinas + saldoFinalProjetado.caixa;

        // 5. Comparar com saldo atual
        const saldoAtualTotal = (saldoInicialEsperado.bancos + saldoInicialEsperado.maquinas + saldoInicialEsperado.caixa);
        
        const divergencia = Math.abs(saldoFinalProjetado.total - saldoAtualTotal);
        const precisaAlterar = divergencia > 0.01; // Tolerância de 1 centavo

        const registro = {
          mes,
          saldo_inicial_atual: saldoAtualTotal,
          saldo_final_calculado: saldoFinalProjetado.total,
          divergencia,
          precisa_alterar: precisaAlterar,
          recebimentos: totalRecebimentos,
          pagamentos: totalPagamentos
        };

        // 6. Se houver divergência e não for dry run, atualizar
        if (precisaAlterar && !dry_run) {
          // Atualizar saldo inicial do mês com o saldo final do mês anterior
          const novosDetalhes = {
            bancos: dfc.detalhes?.bancos?.map(b => ({ ...b, saldo: 0 })) || [],
            maquinas_cartao: dfc.detalhes?.maquinas_cartao?.map(m => ({ ...m, saldo: 0 })) || [],
            caixa: 0
          };

          // Distribuir saldo final anterior proporcionalmente
          if (saldo_final_anterior.total > 0) {
            const proporcaoBancos = saldo_final_anterior.bancos / saldo_final_anterior.total;
            const proporcaoMaquinas = saldo_final_anterior.maquinas / saldo_final_anterior.total;
            const proporcaoCaixa = saldo_final_anterior.caixa / saldo_final_anterior.total;

            novosDetalhes.bancos = novosDetalhes.bancos.map(b => ({
              ...b,
              saldo: Math.round(saldo_final_anterior.total * proporcaoBancos / novosDetalhes.bancos.length * 100) / 100
            }));
            
            novosDetalhes.maquinas_cartao = novosDetalhes.maquinas_cartao.map(m => ({
              ...m,
              saldo: Math.round(saldo_final_anterior.total * proporcaoMaquinas / novosDetalhes.maquinas_cartao.length * 100) / 100
            }));
            
            novosDetalhes.caixa = Math.round(saldo_final_anterior.total * proporcaoCaixa * 100) / 100;
          }

          await base44.entities.DFCLancamento.update(dfc.id, {
            saldo_inicial: saldo_final_anterior.total,
            detalhes: novosDetalhes
          });

          registro.foi_alterado = true;
          registro.novo_saldo_inicial = saldo_final_anterior.total;
          resultados.alterados++;
        }

        resultados.detalhes.push(registro);
        resultados.processados++;

        // Atualizar saldo final para próximo mês
        saldo_final_anterior = saldoFinalProjetado;

      } catch (error) {
        console.error(`[BACKFILL SALDOS] Erro ao processar mês ${dfc.mes}:`, error);
        resultados.erros.push({
          mes: dfc.mes,
          erro: error.message
        });
      }
    }

    console.log(`[BACKFILL SALDOS] Concluído: ${resultados.processados} processados, ${resultados.alterados} alterados`);

    return Response.json({
      sucesso: true,
      mensagem: dry_run 
        ? `Simulação concluída. ${resultados.processados} meses analisados, ${resultados.alterados} precisariam de ajuste.`
        : `Backfill concluído. ${resultados.processados} meses processados, ${resultados.alterados} alterados.`,
      resultados
    });

  } catch (error) {
    console.error('[BACKFILL SALDOS] Erro geral:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});