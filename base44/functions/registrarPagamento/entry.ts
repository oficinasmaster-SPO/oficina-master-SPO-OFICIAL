import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      conta_receber_id,
      data_pagamento,
      valor_recebido,
      forma_pagamento,
      banco_destino,
      desconto_concedido = 0,
      juros_recebido = 0,
      multa_recebida = 0,
      observacoes = ''
    } = await req.json();

    // Validações
    if (!conta_receber_id) {
      return Response.json({ error: 'Conta a receber ID obrigatório' }, { status: 400 });
    }

    if (!data_pagamento) {
      return Response.json({ error: 'Data de pagamento obrigatória' }, { status: 400 });
    }

    if (!forma_pagamento) {
      return Response.json({ error: 'Forma de pagamento obrigatória' }, { status: 400 });
    }

    if (!valor_recebido || valor_recebido <= 0) {
      return Response.json({ error: 'Valor recebido deve ser maior que zero' }, { status: 400 });
    }

    // Busca conta a receber
    const contaReceber = await base44.entities.ContaReceber.get(conta_receber_id);
    if (!contaReceber) {
      return Response.json({ error: 'Conta a receber não encontrada' }, { status: 404 });
    }

    // DEDUP FIX (2026-06-10): bloquear pagamento duplo em conta já liquidada.
    // Double-click ou retry de rede registraria dois lançamentos no DFC.
    // Se a conta já está paga/liquidada, retornar sucesso idempotente.
    if (contaReceber.status === 'pago' || contaReceber.status === 'liquidado') {
      console.warn(`[DEDUP] ContaReceber ${conta_receber_id} já está ${contaReceber.status} — pagamento duplicado bloqueado`);
      return Response.json({
        success: true,
        message: 'Pagamento já registrado anteriormente',
        idempotent: true,
        conta_receber_id,
        status: contaReceber.status
      });
    }

    // Valida valor não exceder saldo aberto
    const valorAberto = contaReceber.valor_aberto || contaReceber.valor_original;
    if (valor_recebido > valorAberto + 0.01) { // tolerância de 1 centavo
      return Response.json({ 
        error: `Valor recebido (R$ ${valor_recebido.toFixed(2)}) não pode ser maior que o saldo aberto (R$ ${valorAberto.toFixed(2)})`,
        valor_recebido,
        saldo_aberto: valorAberto
      }, { status: 400 });
    }

    // Calcula valor líquido
    const valorLiquido = valor_recebido - desconto_concedido + juros_recebido + multa_recebida;

    // PASO 1: Cria LiquidaçãoFinanceira
    const liquidacao = await base44.entities.LiquidacaoFinanceira.create({
      workshop_id: contaReceber.workshop_id,
      conta_receber_id: conta_receber_id,
      tipo: 'recebimento',
      valor_liquidacao: valor_recebido,
      data_liquidacao: data_pagamento,
      forma_pagamento,
      banco_destino: banco_destino || '',
      numero_documento: contaReceber.numero_documento || '',
      desconto_concedido,
      juros_recebido,
      multa_recebida,
      valor_liquido: valorLiquido,
      conciliado: false, // aguarda conciliação bancária
      observacoes,
      conciliado_por: null,
      data_conciliacao: null
    });

    // PASO 2: Atualiza ContaReceber
    const valorPagoAtualizado = (contaReceber.valor_pago || 0) + valor_recebido;
    const valorAbertoAtualizado = valorAberto - valor_recebido;
    
    let novoStatus = 'aberto';
    if (valorAbertoAtualizado <= 0.01) {
      novoStatus = 'pago';
    } else if (valorPagoAtualizado > 0) {
      novoStatus = 'parcial';
    }

    await base44.entities.ContaReceber.update(conta_receber_id, {
      valor_pago: valorPagoAtualizado,
      valor_aberto: valorAbertoAtualizado,
      status: novoStatus,
      data_primeiro_pagamento: contaReceber.data_primeiro_pagamento || data_pagamento,
      dias_atraso: calcularDiasAtraso(data_pagamento, contaReceber.data_vencimento)
    });

    // PASO 3: Gera DFC (entrada de caixa)
    const mesPagamento = data_pagamento.substring(0, 7); // YYYY-MM
    await base44.entities.DFCLancamento.create({
      workshop_id: contaReceber.workshop_id,
      mes: mesPagamento,
      grupo: 'operacional',
      tipo: 'entrada',
      descricao: `Recebimento - ${contaReceber.cliente_nome || 'Cliente'}`,
      valor: valorLiquido,
      origem: 'liquidacao_financeira',
      data_pagamento: data_pagamento,
      fonte_saida: determinarFonteSaida(forma_pagamento),
      detalhes: {
        conta_receber_id: conta_receber_id,
        liquidacao_financeira_id: liquidacao.id,
        forma_pagamento,
        cliente: contaReceber.cliente_nome
      }
    });

    // PASO 4: Registra auditoria (non-blocking)
    try {
      await base44.functions.invoke('auditLog', {
        acao: 'registrar_pagamento',
        entidade: 'ContaReceber',
        entidade_id: conta_receber_id,
        usuario_id: user.id,
        usuario_email: user.email,
        detalhes: {
          valor_recebido,
          forma_pagamento,
          data_pagamento,
          liquidacao_id: liquidacao.id,
          status_anterior: contaReceber.status,
          status_novo: novoStatus
        }
      });
    } catch (_) { /* auditoria não bloqueia o fluxo */ }

    return Response.json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      liquidacao_id: liquidacao.id,
      conta_receber: {
        id: conta_receber_id,
        status: novoStatus,
        valor_pago: valorPagoAtualizado,
        valor_aberto: valorAbertoAtualizado
      },
      dfc_gerado: true,
      conciliacao_pendente: true
    });

  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularDiasAtraso(dataPagamento, dataVencimento) {
  if (!dataPagamento || !dataVencimento) return 0;
  const pag = new Date(dataPagamento);
  const venc = new Date(dataVencimento);
  const diff = pag - venc;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function determinarFonteSaida(formaPagamento) {
  const mapa = {
    'pix': 'banco',
    'ted': 'banco',
    'boleto': 'banco',
    'cartao_credito': 'maquina_cartao',
    'cartao_debito': 'maquina_cartao',
    'dinheiro': 'caixa',
    'cheque': 'banco'
  };
  return mapa[formaPagamento] || 'banco';
}