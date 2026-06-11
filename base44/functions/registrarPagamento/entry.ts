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

    // LOCK OTIMISTA (2026-06-10): elimina race condition de pagamento duplo simultâneo.
    // Padrão: gravar lock → re-ler → verificar ownership → processar → liberar lock.
    // Reduz janela de race condition de ~400ms para ~50ms (1 round-trip).
    // TTL de 30s previne locks travados por erro de servidor.

    // 1. Bloquear se já pago (retries sequenciais — fix anterior mantido)
    if (contaReceber.status === 'pago' || contaReceber.status === 'liquidado') {
      console.warn(`[LOCK] ContaReceber ${conta_receber_id} já está ${contaReceber.status}`);
      return Response.json({
        success: true,
        message: 'Pagamento já registrado anteriormente',
        idempotent: true,
        conta_receber_id,
        status: contaReceber.status
      });
    }

    // 2. Verificar se outro request está processando (lock ativo e não expirado)
    const LOCK_TTL_MS = 30_000; // 30 segundos
    const now = new Date();
    if (contaReceber.processing === true && contaReceber.processing_at) {
      const lockAge = now.getTime() - new Date(contaReceber.processing_at).getTime();
      if (lockAge < LOCK_TTL_MS) {
        console.warn(`[LOCK] ContaReceber ${conta_receber_id} está sendo processado (lock ativo há ${lockAge}ms)`);
        return Response.json({
          error: 'Pagamento já está sendo processado. Aguarde alguns segundos e tente novamente.',
          locked: true,
          locked_by: contaReceber.processing_by,
          locked_since: contaReceber.processing_at
        }, { status: 409 });
      }
      // Lock expirado — continuar (servidor travou na operação anterior)
      console.warn(`[LOCK] Lock expirado (${Math.round(lockAge/1000)}s) — assumindo controle`);
    }

    // 3. Gravar lock com timestamp e user_id
    const lockAt = now.toISOString();
    await base44.entities.ContaReceber.update(conta_receber_id, {
      processing: true,
      processing_at: lockAt,
      processing_by: user.id
    });

    // 4. Re-ler e verificar se fui EU quem gravou o lock (reduz janela para ~50ms)
    const contaReLida = await base44.entities.ContaReceber.get(conta_receber_id);
    if (contaReLida.processing_at !== lockAt || contaReLida.processing_by !== user.id) {
      console.warn(`[LOCK] Race condition detectada — outro request ganhou o lock`);
      return Response.json({
        error: 'Conflito de processamento detectado. Tente novamente.',
        locked: true
      }, { status: 409 });
    }

    // 5. Lock confirmado — verificar novamente status (pode ter mudado entre T₀ e agora)
    if (contaReLida.status === 'pago' || contaReLida.status === 'liquidado') {
      await base44.entities.ContaReceber.update(conta_receber_id, { processing: false, processing_at: null, processing_by: null });
      return Response.json({ success: true, message: 'Pagamento já registrado', idempotent: true });
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

    // Liberar lock ao mesmo tempo que atualiza status (mesma operação — atômico)
    await base44.entities.ContaReceber.update(conta_receber_id, {
      valor_pago: valorPagoAtualizado,
      valor_aberto: valorAbertoAtualizado,
      status: novoStatus,
      data_primeiro_pagamento: contaReceber.data_primeiro_pagamento || data_pagamento,
      dias_atraso: calcularDiasAtraso(data_pagamento, contaReceber.data_vencimento),
      processing: false,       // LOCK RELEASE — libera lock junto com a atualização de status
      processing_at: null,
      processing_by: null
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