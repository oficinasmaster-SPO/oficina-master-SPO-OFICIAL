import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export class FinancialEngine {
  constructor(base44) {
    this.base44 = base44;
  }

  // ==================== DRE ====================

  async getDRE(mes, workshopId) {
    const lancamentos = await this.base44.entities.DRELancamento.filter({
      workshop_id: workshopId,
      mes
    });

    const receitas = lancamentos.filter(l => l.tipo === 'receita');
    const despesas = lancamentos.filter(l => l.tipo === 'despesa');

    const faturamento = this.sum(receitas.map(l => l.valor));
    const custosDiretos = this.sum(despesas.filter(l => l.entra_tcmp2).map(l => l.valor));
    const despesasTotais = this.sum(despesas.map(l => l.valor));
    const lucro = faturamento - despesasTotais;

    return {
      faturamento,
      custos_diretos: custosDiretos,
      despesas_totais: despesasTotais,
      lucro_liquido: lucro,
      margem_liquida: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      tcmp2: await this.calcularTCMP2(custosDiretos, mes, workshopId),
      r70: this.calcularR70(receitas),
      i30: this.calcularI30(receitas)
    };
  }

  async getDREAcumulado(ano, workshopId) {
    const resultados = [];
    
    for (let mes = 1; mes <= 12; mes++) {
      const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
      const dre = await this.getDRE(mesStr, workshopId);
      resultados.push({ mes: mesStr, ...dre });
    }

    return resultados;
  }

  // ==================== DFC ====================

  async getDFC(mes, workshopId) {
    // Busca TODAS as liquidações do mês
    const liquidacoes = await this.base44.entities.LiquidacaoFinanceira.filter({
      workshop_id: workshopId,
      data_liquidacao: { $gte: `${mes}-01`, $lte: `${mes}-31` }
    });

    const recebimentos = liquidacoes.filter(l => l.tipo === 'recebimento');
    const pagamentos = liquidacoes.filter(l => l.tipo === 'pagamento');

    const entradas = this.sum(recebimentos.map(l => l.valor_liquido));
    const saidas = this.sum(pagamentos.map(l => l.valor_liquidacao));

    // Saldo inicial (do mês anterior)
    const saldoInicial = await this.getSaldoFinal(this.subtrairMes(mes), workshopId);

    // Saldo final
    const saldoFinal = saldoInicial + entradas - saidas;

    // Detalha por fonte
    const porBanco = this.sum(recebimentos
      .filter(l => l.forma_pagamento === 'pix' || l.forma_pagamento === 'ted')
      .map(l => l.valor_liquido));
    
    const porMaquina = this.sum(recebimentos
      .filter(l => l.forma_pagamento.includes('cartao'))
      .map(l => l.valor_liquido));
    
    const porCaixa = this.sum(recebimentos
      .filter(l => l.forma_pagamento === 'dinheiro')
      .map(l => l.valor_liquido));

    // Taxa de conciliação
    const conciliados = recebimentos.filter(l => l.conciliado).length;
    const taxaConciliacao = recebimentos.length > 0 ? (conciliados / recebimentos.length) * 100 : 0;

    return {
      saldo_inicial: saldoInicial,
      entradas_totais: entradas,
      saidas_totais: saidas,
      saldo_final: saldoFinal,
      detalhamento: {
        banco: porBanco,
        maquina_cartao: porMaquina,
        caixa: porCaixa
      },
      conciliacao: {
        total: recebimentos.length,
        conciliados,
        taxa: taxaConciliacao
      }
    };
  }

  async getDFCAcumulado(ano, workshopId) {
    const resultados = [];
    
    for (let mes = 1; mes <= 12; mes++) {
      const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
      const dfc = await this.getDFC(mesStr, workshopId);
      resultados.push({ mes: mesStr, ...dfc });
    }

    return resultados;
  }

  // ==================== CONTAS A RECEBER ====================

  async getContasReceber(filters) {
    const query = {
      workshop_id: filters.workshopId,
      status: filters.status || { $in: ['aberto', 'parcial', 'vencido'] }
    };

    if (filters.vencido) {
      query.data_vencimento = { $lt: new Date().toISOString().slice(0, 10) };
      query.status = { $ne: 'pago' };
    }

    if (filters.cliente_id) {
      query.cliente_id = filters.cliente_id;
    }

    const contas = await this.base44.entities.ContaReceber.filter(query);

    return {
      total: contas.length,
      valor_aberto: this.sum(contas.map(c => c.valor_aberto)),
      valor_vencido: this.sum(
        contas.filter(c => c.data_vencimento < new Date().toISOString().slice(0, 10))
          .map(c => c.valor_aberto)
      ),
      dias_atraso_medio: this.avg(contas.map(c => c.dias_atraso || 0)),
      contas
    };
  }

  // ==================== CONTAS A PAGAR ====================

  async getContasPagar(filters) {
    const query = {
      workshop_id: filters.workshopId,
      status: filters.status || { $in: ['aberto', 'parcial', 'vencido'] }
    };

    if (filters.vencido) {
      query.data_vencimento = { $lt: new Date().toISOString().slice(0, 10) };
      query.status = { $ne: 'pago' };
    }

    if (filters.fornecedor_id) {
      query.fornecedor_id = filters.fornecedor_id;
    }

    const contas = await this.base44.entities.ContaPagar.filter(query);

    return {
      total: contas.length,
      valor_aberto: this.sum(contas.map(c => c.valor_aberto)),
      valor_vencido: this.sum(
        contas.filter(c => c.data_vencimento < new Date().toISOString().slice(0, 10))
          .map(c => c.valor_aberto)
      ),
      dias_atraso_medio: this.avg(contas.map(c => c.dias_atraso || 0)),
      contas
    };
  }

  async getContasVencidas(workshopId) {
    return await this.getContasReceber({
      workshopId,
      vencido: true
    });
  }

  // ==================== CAIXA ====================

  async getCashFlow(workshopId, periodo = 30) {
    const saldoAtual = await this.getSaldoAtual(workshopId);
    
    const receberFuturo = await this.getContasReceber({ 
      workshopId,
      status: ['aberto', 'parcial']
    });
    
    const pagarFuturo = await this.getContasPagar({ 
      workshopId,
      status: ['aberto', 'parcial']
    });

    return {
      saldo_inicial: saldoAtual,
      entradas_previstas: receberFuturo.valor_aberto,
      saidas_previstas: pagarFuturo.valor_aberto,
      saldo_final_projetado: saldoAtual + receberFuturo.valor_aberto - pagarFuturo.valor_aberto,
      periodo_projecao_dias: periodo
    };
  }

  async getSaldoAtual(workshopId) {
    // Pega último mês fechado ou mês atual
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    const dfc = await this.getDFC(mesAtual, workshopId);
    return dfc.saldo_final;
  }

  async getSaldoFinal(mes, workshopId) {
    if (!mes) return 0;
    
    const dfc = await this.getDFC(mes, workshopId);
    return dfc.saldo_final;
  }

  async getSaldoProjecao(workshopId, dias = 30) {
    return await this.getCashFlow(workshopId, dias);
  }

  // ==================== KPIs ====================

  async getKPIs(mes, workshopId) {
    const dre = await this.getDRE(mes, workshopId);
    const dfc = await this.getDFC(mes, workshopId);
    const contas = await this.getContasReceber({ workshopId });

    return {
      faturamento: dre.faturamento,
      lucro_liquido: dre.lucro_liquido,
      margem_liquida: dre.margem_liquida,
      tcmp2: dre.tcmp2,
      r70: dre.r70,
      i30: dre.i30,
      caixa_final: dfc.saldo_final,
      entradas: dfc.entradas_totais,
      saidas: dfc.saidas_totais,
      contas_receber_aberto: contas.valor_aberto,
      contas_receber_vencido: contas.valor_vencido,
      inadimplencia: contas.valor_aberto > 0 
        ? (contas.valor_vencido / contas.valor_aberto) * 100 
        : 0,
      conciliacao_taxa: dfc.conciliacao?.taxa || 0
    };
  }

  async getTCMP2(mes, workshopId) {
    const dre = await this.getDRE(mes, workshopId);
    return dre.tcmp2;
  }

  async getR70I30(mes, workshopId) {
    const dre = await this.getDRE(mes, workshopId);
    return {
      r70: dre.r70,
      i30: dre.i30
    };
  }

  async getMargemLiquida(mes, workshopId) {
    const dre = await this.getDRE(mes, workshopId);
    return dre.margem_liquida;
  }

  // ==================== BUDGET ====================

  async getBudgetVsActual(mes, workshopId) {
    // Busca metas do mês
    const metas = await this.base44.entities.BudgetMeta.filter({
      workshop_id: workshopId,
      mes
    });

    // Busca realizado do DRE
    const dre = await this.getDRE(mes, workshopId);

    // Compara meta vs realizado
    const comparacao = metas.map(meta => {
      const realizado = dre[meta.tipo === 'receita' ? 'faturamento' : 'despesas_totais'] || 0;
      const metaValor = meta.meta_fixa_rs || 0;
      const atingimento = metaValor > 0 ? (realizado / metaValor) * 100 : 0;

      return {
        ...meta,
        realizado,
        atingimento,
        diferenca: realizado - metaValor,
        status: atingimento >= 100 ? 'acima' : atingimento >= 80 ? 'dentro' : 'abaixo'
      };
    });

    return {
      metas: comparacao,
      total_metas: metas.length,
      atingimento_medio: this.avg(comparacao.map(c => c.atingimento))
    };
  }

  // ==================== CONCILIAÇÃO ====================

  async conciliateBankTransactions(workshopId, banco) {
    // Busca transações pendentes
    const transacoesPendentes = await this.base44.entities.BankTransaction.filter({
      workshop_id,
      banco,
      status_conciliacao: 'pendente'
    });

    // Busca liquidações não conciliadas
    const liquidacoesPendentes = await this.base44.entities.LiquidacaoFinanceira.filter({
      workshop_id,
      conciliado: false
    });

    let conciliadas = 0;
    let divergentes = 0;

    for (const transacao of transacoesPendentes) {
      const match = liquidacoesPendentes.find(l => {
        const valorMatch = Math.abs(l.valor_liquidacao - transacao.valor) < 0.01;
        
        const dataTransacao = new Date(transacao.data_operacao);
        const dataLiquidação = new Date(l.data_liquidacao);
        const diffDias = Math.abs((dataTransacao - dataLiquidação) / (1000 * 60 * 60 * 24));
        const dataMatch = diffDias <= 2;
        
        return valorMatch && dataMatch;
      });

      if (match) {
        await this.base44.entities.BankTransaction.update(transacao.id, {
          liquidacao_financeira_id: match.id,
          status_conciliacao: 'conciliado',
          data_conciliacao: new Date().toISOString(),
          conciliado_por: 'sistema_auto'
        });

        await this.base44.entities.LiquidacaoFinanceira.update(match.id, {
          conciliado: true,
          data_conciliacao: new Date().toISOString()
        });

        conciliadas++;
      } else {
        await this.base44.entities.BankTransaction.update(transacao.id, {
          status_conciliacao: 'divergente',
          divergencia_tipo: 'sem_match_sistema'
        });
        divergentes++;
      }
    }

    const pendentes = transacoesPendentes.length - conciliadas - divergentes;

    return {
      total: transacoesPendentes.length,
      conciliadas,
      pendentes,
      divergentes,
      taxa_sucesso: transacoesPendentes.length > 0 
        ? (conciliadas / transacoesPendentes.length) * 100 
        : 0
    };
  }

  async getConciliacaoStatus(workshopId) {
    const transacoes = await this.base44.entities.BankTransaction.filter({
      workshop_id: workshopId
    });

    const conciliados = transacoes.filter(t => t.status_conciliacao === 'conciliado').length;
    const pendentes = transacoes.filter(t => t.status_conciliacao === 'pendente').length;
    const divergentes = transacoes.filter(t => t.status_conciliacao === 'divergente').length;

    return {
      total: transacoes.length,
      conciliados,
      pendentes,
      divergentes,
      taxa_conciliacao: transacoes.length > 0 
        ? (conciliados / transacoes.length) * 100 
        : 0
    };
  }

  // ==================== HELPERS ====================

  sum(array) {
    return array.reduce((acc, val) => acc + (val || 0), 0);
  }

  avg(array) {
    if (array.length === 0) return 0;
    return this.sum(array) / array.length;
  }

  async calcularTCMP2(custosDiretos, mes, workshopId) {
    // Busca horas trabalhadas do QGP (se existir)
    try {
      const registros = await this.base44.entities.RegistroDiario.filter({
        workshop_id: workshopId,
        data: { $gte: `${mes}-01`, $lte: `${mes}-31` }
      });
      
      const totalHoras = this.sum(registros.map(r => r.total_horas || 0));
      return totalHoras > 0 ? custosDiretos / totalHoras : 0;
    } catch {
      return 0;
    }
  }

  calcularR70(receitas) {
    const servicos = this.sum(
      receitas.filter(r => r.categoria?.includes('Serviço'))
        .map(r => r.valor)
    );
    
    const total = this.sum(receitas.map(r => r.valor));
    return total > 0 ? (servicos / total) * 100 : 0;
  }

  calcularI30(receitas) {
    const pecas = this.sum(
      receitas.filter(r => r.categoria?.includes('Peças'))
        .map(r => r.valor)
    );
    
    const total = this.sum(receitas.map(r => r.valor));
    return total > 0 ? (pecas / total) * 100 : 0;
  }

  subtrairMes(mesStr) {
    const [ano, mes] = mesStr.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    data.setMonth(data.getMonth() - 1);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }
}

// Export para uso em backend functions
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();
    const engine = new FinancialEngine(base44);

    // Roteamento de ações
    switch (action) {
      case 'getDRE':
        return Response.json(await engine.getDRE(params.mes, params.workshopId));
      case 'getDFC':
        return Response.json(await engine.getDFC(params.mes, params.workshopId));
      case 'getKPIs':
        return Response.json(await engine.getKPIs(params.mes, params.workshopId));
      case 'getContasReceber':
        return Response.json(await engine.getContasReceber(params.filters));
      case 'getContasPagar':
        return Response.json(await engine.getContasPagar(params.filters));
      case 'getCashFlow':
        return Response.json(await engine.getCashFlow(params.workshopId, params.periodo));
      case 'conciliate':
        return Response.json(await engine.conciliateBankTransactions(params.workshopId, params.banco));
      default:
        return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});