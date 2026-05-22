import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas administradores podem fechar mês
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem fechar mês' }, { status: 403 });
    }

    const { mes, workshop_id, justificativa } = await req.json();

    // Validações
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return Response.json({ error: 'Mês inválido (use YYYY-MM)' }, { status: 400 });
    }

    if (!workshop_id) {
      return Response.json({ error: 'Workshop ID obrigatório' }, { status: 400 });
    }

    if (!justificativa || justificativa.length < 20) {
      return Response.json({ error: 'Justificativa obrigatória (mínimo 20 caracteres)' }, { status: 400 });
    }

    // Verifica se já está fechado
    const snapshotExistente = await base44.entities.FinancialMonthSnapshot.filter({
      workshop_id,
      mes,
      status: 'fechado'
    });

    if (snapshotExistente.length > 0) {
      return Response.json({ error: 'Mês já está fechado', snapshot_id: snapshotExistente[0].id }, { status: 400 });
    }

    // Coleta dados do mês (Financial Engine)
    const dadosDRE = await getDREData(base44, mes, workshop_id);
    const dadosDFC = await getDFCData(base44, mes, workshop_id);
    const dadosContasReceber = await getContasReceberData(base44, mes, workshop_id);
    const dadosContasPagar = await getContasPagarData(base44, mes, workshop_id);
    const dadosBudget = await getBudgetData(base44, mes, workshop_id);

    // Gera hash de integridade
    const kpiHash = gerarKPIHash({
      dre: dadosDRE,
      dfc: dadosDFC,
      contas_receber: dadosContasReceber,
      contas_pagar: dadosContasPagar,
      budget: dadosBudget
    });

    // Cria snapshot
    const snapshot = await base44.entities.FinancialMonthSnapshot.create({
      workshop_id,
      mes,
      status: 'fechado',
      data_fechamento: new Date().toISOString(),
      fechado_por: user.id,
      fechado_por_nome: user.full_name,
      fechado_por_email: user.email,
      justificativa,
      
      // DRE
      dre_faturamento_total: dadosDRE.faturamento,
      dre_custos_diretos: dadosDRE.custos_diretos,
      dre_despesas_operacionais: dadosDRE.despesas_operacionais,
      dre_lucro_liquido: dadosDRE.lucro_liquido,
      dre_margem_liquida: dadosDRE.margem_liquida,
      dre_tcmp2: dadosDRE.tcmp2,
      dre_r70: dadosDRE.r70,
      dre_i30: dadosDRE.i30,
      
      // DFC
      dfc_saldo_inicial: dadosDFC.saldo_inicial,
      dfc_entradas_totais: dadosDFC.entradas_totais,
      dfc_saidas_totais: dadosDFC.saidas_totais,
      dfc_saldo_final: dadosDFC.saldo_final,
      dfc_saldo_banco: dadosDFC.saldo_banco,
      dfc_saldo_maquina: dadosDFC.saldo_maquina,
      dfc_saldo_caixa: dadosDFC.saldo_caixa,
      
      // Contas
      contas_receber_aberto: dadosContasReceber.valor_aberto,
      contas_receber_vencido: dadosContasReceber.valor_vencido,
      contas_receber_atraso_medio: dadosContasReceber.dias_atraso_medio,
      contas_pagar_aberto: dadosContasPagar.valor_aberto,
      contas_pagar_vencido: dadosContasPagar.valor_vencido,
      
      // Budget
      budget_meta_total: dadosBudget.meta_total,
      budget_realizado_total: dadosBudget.realizado_total,
      budget_atingimento: dadosBudget.atingimento,
      
      // Auditoria
      kpi_hash: kpiHash,
      auditoria_json: {
        dre: dadosDRE,
        dfc: dadosDFC,
        contas_receber: dadosContasReceber,
        contas_pagar: dadosContasPagar,
        budget: dadosBudget,
        timestamp_fechamento: new Date().toISOString(),
        usuario_fechamento: user.email,
        ip_usuario: 'N/A' // Poderia extrair do request
      }
    });

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'fechar_mes',
      entidade: 'FinancialMonthSnapshot',
      entidade_id: snapshot.id,
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        mes,
        workshop_id,
        justificativa,
        kpi_hash: kpiHash
      }
    });

    return Response.json({
      success: true,
      message: 'Mês fechado com sucesso',
      snapshot_id: snapshot.id,
      mes,
      kpi_hash: kpiHash,
      resumo: {
        faturamento: dadosDRE.faturamento,
        lucro_liquido: dadosDRE.lucro_liquido,
        margem_liquida: dadosDRE.margem_liquida,
        saldo_final_caixa: dadosDFC.saldo_final
      }
    });

  } catch (error) {
    console.error('Erro ao fechar mês:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helpers - Financial Engine
async function getDREData(base44, mes, workshop_id) {
  const lancamentos = await base44.entities.DRELancamento.filter({
    mes,
    workshop_id
  });

  const receitas = lancamentos.filter(l => l.tipo === 'receita');
  const despesas = lancamentos.filter(l => l.tipo === 'despesa');

  const faturamento = receitas.reduce((sum, l) => sum + l.valor, 0);
  const custosDiretos = despesas.filter(l => l.entra_tcmp2).reduce((sum, l) => sum + l.valor, 0);
  const despesasOperacionais = despesas.reduce((sum, l) => sum + l.valor, 0);
  const lucroLiquido = faturamento - despesasOperacionais;

  // TCMP² (simplificado)
  const horasTrabalhadas = await getHorasTrabalhadas(base44, mes, workshop_id);
  const tcmp2 = horasTrabalhadas > 0 ? custosDiretos / horasTrabalhadas : 0;

  // R70/I30
  const receitaServicos = receitas.filter(l => l.categoria.includes('Serviço')).reduce((sum, l) => sum + l.valor, 0);
  const receitaPecas = receitas.filter(l => l.categoria.includes('Peça')).reduce((sum, l) => sum + l.valor, 0);
  const r70 = faturamento > 0 ? (receitaServicos / faturamento) * 100 : 0;
  const i30 = faturamento > 0 ? (receitaPecas / faturamento) * 100 : 0;

  return {
    faturamento,
    custos_diretos: custosDiretos,
    despesas_operacionais: despesasOperacionais,
    lucro_liquido: lucroLiquido,
    margem_liquida: faturamento > 0 ? (lucroLiquido / faturamento) * 100 : 0,
    tcmp2,
    r70,
    i30
  };
}

async function getDFCData(base44, mes, workshop_id) {
  const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
    workshop_id
  });

  // Filtra por mês da liquidação
  const liquidacoesMes = liquidacoes.filter(l => 
    l.data_liquidacao.startsWith(mes)
  );

  const recebimentos = liquidacoesMes.filter(l => l.tipo === 'recebimento');
  const pagamentos = liquidacoesMes.filter(l => l.tipo === 'pagamento');

  const entradasTotais = recebimentos.reduce((sum, l) => sum + l.valor_liquido, 0);
  const saidasTotais = pagamentos.reduce((sum, l) => sum + l.valor_liquidacao, 0);

  // Saldo inicial (mês anterior)
  const mesAnterior = mesAnteriorFunc(mes);
  const snapshotAnterior = await base44.entities.FinancialMonthSnapshot.filter({
    workshop_id,
    mes: mesAnterior,
    status: 'fechado'
  });

  const saldoInicial = snapshotAnterior.length > 0 ? snapshotAnterior[0].dfc_saldo_final : 0;
  const saldoFinal = saldoInicial + entradasTotais - saidasTotais;

  // Detalhamento por fonte
  const saldoBanco = recebimentos.filter(l => ['pix', 'ted'].includes(l.forma_pagamento)).reduce((sum, l) => sum + l.valor_liquido, 0);
  const saldoMaquina = recebimentos.filter(l => l.forma_pagamento.includes('cartao')).reduce((sum, l) => sum + l.valor_liquido, 0);
  const saldoCaixa = recebimentos.filter(l => l.forma_pagamento === 'dinheiro').reduce((sum, l) => sum + l.valor_liquido, 0);

  return {
    saldo_inicial: saldoInicial,
    entradas_totais: entradasTotais,
    saidas_totais: saidasTotais,
    saldo_final: saldoFinal,
    saldo_banco: saldoBanco,
    saldo_maquina: saldoMaquina,
    saldo_caixa: saldoCaixa
  };
}

async function getContasReceberData(base44, mes, workshop_id) {
  const contas = await base44.entities.ContaReceber.filter({
    workshop_id,
    status: { $in: ['aberto', 'parcial', 'vencido'] }
  });

  // Filtra contas do mês ou anteriores não pagas
  const contasRelevantes = contas.filter(c => 
    c.data_vencimento <= `${mes}-31` && c.valor_aberto > 0
  );

  const valorAberto = contasRelevantes.reduce((sum, c) => sum + c.valor_aberto, 0);
  const valorVencido = contasRelevantes.filter(c => c.data_vencimento < `${mes}-01`).reduce((sum, c) => sum + c.valor_aberto, 0);
  const diasAtrasoMedio = contasRelevantes.length > 0 
    ? contasRelevantes.reduce((sum, c) => sum + (c.dias_atraso || 0), 0) / contasRelevantes.length 
    : 0;

  return {
    valor_aberto: valorAberto,
    valor_vencido: valorVencido,
    dias_atraso_medio: diasAtrasoMedio
  };
}

async function getContasPagarData(base44, mes, workshop_id) {
  const contas = await base44.entities.ContaPagar.filter({
    workshop_id,
    status: { $in: ['aberto', 'parcial', 'vencido'] }
  });

  const contasRelevantes = contas.filter(c => 
    c.data_vencimento <= `${mes}-31` && c.valor_aberto > 0
  );

  const valorAberto = contasRelevantes.reduce((sum, c) => sum + c.valor_aberto, 0);
  const valorVencido = contasRelevantes.filter(c => c.data_vencimento < `${mes}-01`).reduce((sum, c) => sum + c.valor_aberto, 0);

  return {
    valor_aberto: valorAberto,
    valor_vencido: valorVencido
  };
}

async function getBudgetData(base44, mes, workshop_id) {
  const metas = await base44.entities.BudgetMeta.filter({
    workshop_id,
    mes
  });

  const metaTotal = metas.reduce((sum, m) => sum + (m.meta_fixa_rs || 0), 0);
  
  // Realizado vem do DRE
  const dreLancamentos = await base44.entities.DRELancamento.filter({
    mes,
    workshop_id,
    tipo: 'receita'
  });
  
  const realizadoTotal = dreLancamentos.reduce((sum, l) => sum + l.valor, 0);
  const atingimento = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;

  return {
    meta_total: metaTotal,
    realizado_total: realizadoTotal,
    atingimento
  };
}

async function getHorasTrabalhadas(base44, mes, workshop_id) {
  // Busca RegistroDiario do mês
  try {
    const registros = await base44.entities.RegistroDiario.filter({
      workshop_id,
      data: { $gte: `${mes}-01`, $lte: `${mes}-31` }
    });
    
    return registros.reduce((sum, r) => sum + (r.total_horas || 0), 0);
  } catch {
    return 0; // Se não existir entity, retorna 0
  }
}

function mesAnteriorFunc(mes) {
  const [ano, mesNum] = mes.split('-').map(Number);
  const data = new Date(ano, mesNum - 1, 1);
  data.setMonth(data.getMonth() - 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function gerarKPIHash(dados) {
  const hashString = JSON.stringify(dados);
  // Hash simples em base64 (para produção usar crypto mais seguro)
  return btoa(hashString);
}