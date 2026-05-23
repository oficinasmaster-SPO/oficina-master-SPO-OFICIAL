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

// Helper: obter último dia do mês
function getUltimoDiaMes(mesAno) {
  const [ano, mes] = mesAno.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return ultimoDia;
}

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

    // BUG FIX #5: Buscar saldo inicial do primeiro mês como ponto de partida
    const primeiroDfc = dfcLancamentos[0];
    let saldo_final_anterior = {
      bancos: primeiroDfc?.detalhes?.bancos?.reduce((sum, b) => sum + (b.saldo || 0), 0) || 0,
      maquinas: primeiroDfc?.detalhes?.maquinas_cartao?.reduce((sum, m) => sum + (m.saldo || 0), 0) || 0,
      caixa: primeiroDfc?.detalhes?.caixa || 0,
      total: 0
    };
    saldo_final_anterior.total = saldo_final_anterior.bancos + saldo_final_anterior.maquinas + saldo_final_anterior.caixa;

    for (const dfc of dfcLancamentos) {
      try {
        const mes = dfc.mes;
        const ultimoDia = getUltimoDiaMes(mes);
        console.log(`[BACKFILL SALDOS] === Mês: ${mes} (até dia ${ultimoDia}) ===`);
        console.log(`[BACKFILL SALDOS] Saldo final anterior: R$ ${saldo_final_anterior.total.toFixed(2)}`);

        // 1. Buscar liquidações do mês (BUG FIX #1: último dia correto)
        const dataFimMes = `${mes}-${String(ultimoDia).padStart(2, '0')}T23:59:59`;
        console.log(`[BACKFILL SALDOS] Buscando liquidações até: ${dataFimMes}`);
        
        const liquidacoesRecebimento = await base44.entities.LiquidaçãoFinanceira.filter({
          workshop_id,
          tipo: 'recebimento',
          data_liquidacao: { $gte: `${mes}-01`, $lte: dataFimMes }
        });

        const liquidacoesPagamento = await base44.entities.LiquidaçãoFinanceira.filter({
          workshop_id,
          tipo: 'pagamento',
          data_liquidacao: { $gte: `${mes}-01`, $lte: dataFimMes }
        });
        
        console.log(`[BACKFILL SALDOS] Liquidações: ${liquidacoesRecebimento.length} recebimentos, ${liquidacoesPagamento.length} pagamentos`);

        // 2. Calcular totais por fonte (BUG FIX #4: filtro específico de bancos)
        const totalRecebimentos = {
          banco: liquidacoesRecebimento
            .filter(l => {
              // FIX: Verificar se é realmente um banco (não "banco de dados")
              const banco = l.banco_destino || '';
              return banco.toLowerCase().match(/\b(banco|banco do brasil|caixa|bradesco|santander|itau|nubank)\b/);
            })
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
            .filter(l => {
              // FIX: Verificar se é realmente um banco
              const banco = l.banco_origem || '';
              return banco.toLowerCase().match(/\b(banco|banco do brasil|caixa|bradesco|santander|itau|nubank)\b/);
            })
            .reduce((sum, l) => sum + (l.valor_liquidacao), 0),
          maquina: 0, // Máquina de cartão não é fonte de pagamento
          caixa: liquidacoesPagamento
            .filter(l => l.forma_pagamento === 'dinheiro')
            .reduce((sum, l) => sum + (l.valor_liquidacao), 0)
        };

        // 3. Calcular saldo inicial atual do mês
        const saldoInicialAtual = {
          bancos: dfc.detalhes?.bancos?.reduce((sum, b) => sum + (b.saldo || 0), 0) || 0,
          maquinas: dfc.detalhes?.maquinas_cartao?.reduce((sum, m) => sum + (m.saldo || 0), 0) || 0,
          caixa: dfc.detalhes?.caixa || 0
        };
        const saldoInicialAtualTotal = saldoInicialAtual.bancos + saldoInicialAtual.maquinas + saldoInicialAtual.caixa;
        
        console.log(`[BACKFILL SALDOS] Saldo inicial atual: R$ ${saldoInicialAtualTotal.toFixed(2)} (B: ${saldoInicialAtual.bancos.toFixed(2)}, M: ${saldoInicialAtual.maquinas.toFixed(2)}, C: ${saldoInicialAtual.caixa.toFixed(2)})`);
        console.log(`[BACKFILL SALDOS] Recebimentos: R$ ${(totalRecebimentos.banco + totalRecebimentos.maquina + totalRecebimentos.caixa).toFixed(2)}`);
        console.log(`[BACKFILL SALDOS] Pagamentos: R$ ${(totalPagamentos.banco + totalPagamentos.caixa).toFixed(2)}`);

        // BUG FIX #2: Comparar saldo inicial do mês com saldo final do mês anterior
        // Regra: Saldo Inicial (mês M) deve ser igual a Saldo Final (mês M-1)
        const divergencia = Math.abs(saldo_final_anterior.total - saldoInicialAtualTotal);
        const precisaAlterar = divergencia > 0.01; // Tolerância de 1 centavo
        
        console.log(`[BACKFILL SALDOS] Divergência: R$ ${divergencia.toFixed(2)} - ${precisaAlterar ? 'PRECISA ALTERAR' : 'OK'}`);

        // 4. Calcular saldo final projetado do mês atual
        const saldoFinalProjetado = {
          bancos: saldoInicialAtual.bancos + totalRecebimentos.banco - totalPagamentos.banco,
          maquinas: saldoInicialAtual.maquinas + totalRecebimentos.maquina,
          caixa: saldoInicialAtual.caixa + totalRecebimentos.caixa - totalPagamentos.caixa
        };
        saldoFinalProjetado.total = saldoFinalProjetado.bancos + saldoFinalProjetado.maquinas + saldoFinalProjetado.caixa;

        const registro = {
          mes,
          saldo_inicial_anterior: saldo_final_anterior.total,
          saldo_inicial_atual: saldoInicialAtualTotal,
          saldo_final_calculado: saldoFinalProjetado.total,
          divergencia,
          precisa_alterar: precisaAlterar,
          recebimentos: totalRecebimentos,
          pagamentos: totalPagamentos
        };

        // 6. Se houver divergência e não for dry run, atualizar
        if (precisaAlterar && !dry_run) {
          // BUG FIX #3: Prevenir divisão por zero
          const novosDetalhes = {
            bancos: dfc.detalhes?.bancos?.map(b => ({ ...b, saldo: 0 })) || [],
            maquinas_cartao: dfc.detalhes?.maquinas_cartao?.map(m => ({ ...m, saldo: 0 })) || [],
            caixa: 0
          };

          // Distribuir saldo final anterior proporcionalmente
          if (saldo_final_anterior.total > 0) {
            const qtdBancos = novosDetalhes.bancos.length || 1; // FIX: Evitar divisão por zero
            const qtdMaquinas = novosDetalhes.maquinas_cartao.length || 1; // FIX: Evitar divisão por zero
            
            // Se não houver contas cadastradas, criar rateio igualitário
            if (novosDetalhes.bancos.length === 0 && novosDetalhes.maquinas_cartao.length === 0) {
              // Sem contas: colocar tudo em caixa
              novosDetalhes.caixa = Math.round(saldo_final_anterior.total * 100) / 100;
            } else {
              // Rateio proporcional
              const saldoPorBanco = Math.round((saldo_final_anterior.bancos / qtdBancos) * 100) / 100;
              const saldoPorMaquina = Math.round((saldo_final_anterior.maquinas / qtdMaquinas) * 100) / 100;
              const saldoCaixa = Math.round((saldo_final_anterior.caixa) * 100) / 100;

              novosDetalhes.bancos = novosDetalhes.bancos.map(b => ({ ...b, saldo: saldoPorBanco }));
              novosDetalhes.maquinas_cartao = novosDetalhes.maquinas_cartao.map(m => ({ ...m, saldo: saldoPorMaquina }));
              novosDetalhes.caixa = saldoCaixa;
            }
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

        // Atualizar saldo final para próximo mês (se não foi alterado, usar saldo inicial atual + movimentação)
        if (!registro.foi_alterado) {
          saldo_final_anterior = {
            bancos: saldoInicialAtual.bancos + totalRecebimentos.banco - totalPagamentos.banco,
            maquinas: saldoInicialAtual.maquinas + totalRecebimentos.maquina,
            caixa: saldoInicialAtual.caixa + totalRecebimentos.caixa - totalPagamentos.caixa
          };
          saldo_final_anterior.total = saldo_final_anterior.bancos + saldo_final_anterior.maquinas + saldo_final_anterior.caixa;
        }

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