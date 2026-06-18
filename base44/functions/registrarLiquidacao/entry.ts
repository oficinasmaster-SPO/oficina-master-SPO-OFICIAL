import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      forma_pagamento,
      data_liquidacao,
      fonte_selecionada,
      observacoes
    } = body;

    const desconto = body.desconto_concedido ?? body.desconto ?? 0;
    const juros    = body.juros_recebido    ?? body.juros    ?? 0;
    const multa    = body.multa_recebida    ?? body.multa    ?? 0;

    // Validações básicas
    if (!valor_liquidacao || valor_liquidacao <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }
    if (!forma_pagamento) {
      return Response.json({ error: 'Forma de pagamento obrigatória' }, { status: 400 });
    }
    if (!data_liquidacao) {
      return Response.json({ error: 'Data de liquidação obrigatória' }, { status: 400 });
    }

    const entidadeId = conta_receber_id || conta_pagar_id;
    const entityName = conta_receber_id ? 'ContaReceber' : 'ContaPagar';
    
    if (!entidadeId) {
      return Response.json({ error: 'Informe conta_receber_id ou conta_pagar_id' }, { status: 400 });
    }

    // Busca a conta via asServiceRole para garantir acesso independente de RLS
    let conta;
    try {
      conta = await base44.asServiceRole.entities[entityName].get(entidadeId);
    } catch (_) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }
    
    if (!conta) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Se já está pago, retorna sucesso idempotente
    if (conta.status === 'pago' || conta.status === 'liquidado') {
      return Response.json({
        success: true,
        message: 'Já registrado anteriormente',
        idempotent: true,
        conta_status: conta.status
      });
    }

    // Liberar lock travado (se houver)
    if (conta.processing === true && conta.processing_at) {
      const lockAge = Date.now() - new Date(conta.processing_at).getTime();
      if (lockAge < 30000) {
        return Response.json({ error: 'Processamento em andamento, aguarde alguns segundos.' }, { status: 409 });
      }
    }

    // Calcula valores
    const valorAbertoAtual = (conta.valor_aberto != null) ? conta.valor_aberto : conta.valor_original;
    
    if (valor_liquidacao > valorAbertoAtual + 0.01) {
      return Response.json({ 
        error: `Valor (${valor_liquidacao}) excede o saldo em aberto (${valorAbertoAtual})`
      }, { status: 400 });
    }

    const novoValorAberto = Math.max(0, valorAbertoAtual - valor_liquidacao);
    const novoValorPago = (conta.valor_pago || 0) + valor_liquidacao;
    const novoStatus = novoValorAberto <= 0.01 ? 'pago' : 'parcial';
    const valorLiquido = valor_liquidacao + (juros || 0) + (multa || 0) - (desconto || 0);

    // 1. Atualiza ContaReceber/ContaPagar (inclui histórico já aqui)
    const novoHistoricoItem = {
      tipo: tipo === 'recebimento' ? 'recebimento_registrado' : 'pagamento_registrado',
      usuario_nome: user.full_name || user.email || '—',
      usuario_email: user.email || '',
      data_hora: new Date().toISOString(),
      detalhes: `${tipo === 'recebimento' ? 'Recebimento' : 'Pagamento'} de R$${valor_liquidacao.toFixed(2)} via ${forma_pagamento}${desconto > 0 ? `, desconto R$${desconto.toFixed(2)}` : ''}${juros > 0 ? `, juros R$${juros.toFixed(2)}` : ''}`,
    };
    const historicoAtual = conta.historico_alteracoes || [];
    const updatePayload = {
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      status: novoStatus,
      processing: false,
      processing_at: null,
      processing_by: null,
      dias_atraso: calcularDiasAtraso(conta.data_vencimento, data_liquidacao),
      historico_alteracoes: [...historicoAtual, novoHistoricoItem],
    };
    if (!conta.data_primeiro_pagamento) {
      updatePayload.data_primeiro_pagamento = data_liquidacao;
    }
    await base44.asServiceRole.entities[entityName].update(entidadeId, updatePayload);

    // 2. Cria LiquidacaoFinanceira
    const liquidacao = await base44.asServiceRole.entities.LiquidacaoFinanceira.create({
      workshop_id: conta.workshop_id,
      conta_receber_id: conta_receber_id || null,
      conta_pagar_id: conta_pagar_id || null,
      tipo,
      valor_liquidacao,
      data_liquidacao,
      forma_pagamento,
      banco_destino: tipo === 'recebimento' ? (fonte_selecionada || null) : null,
      banco_origem: tipo === 'pagamento' ? (fonte_selecionada || null) : null,
      desconto_concedido: desconto || 0,
      juros_recebido: juros || 0,
      multa_recebida: multa || 0,
      valor_liquido: valorLiquido,
      conciliado: false,
      observacoes: observacoes || ''
    });

    // 3. Cria DFCLancamento
    const mesReferencia = String(data_liquidacao).slice(0, 7);
    await base44.asServiceRole.entities.DFCLancamento.create({
      workshop_id: conta.workshop_id,
      mes: mesReferencia,
      origem: 'liquidacao_financeira',
      tipo: tipo === 'recebimento' ? 'entrada' : 'saida',
      grupo: 'operacional',
      descricao: `${tipo === 'recebimento' ? 'Recebimento' : 'Pagamento'} - ${conta.cliente_nome || conta.fornecedor_nome || ''}`,
      valor: valorLiquido,
      fonte_saida: tipo === 'pagamento' ? (fonte_selecionada || null) : null,
    });

    // 4. Atualiza saldo da fonte selecionada (se houver)
    if (fonte_selecionada) {
      try {
        const records = await base44.asServiceRole.entities.DFCLancamento.filter({
          workshop_id: conta.workshop_id,
          mes: mesReferencia,
          grupo: 'saldo_inicial',
        }, '-created_date', 1);
        
        const registroSaldo = records?.[0];
        if (registroSaldo) {
          const detalhes = {
            bancos: registroSaldo.detalhes?.bancos || [],
            maquinas_cartao: registroSaldo.detalhes?.maquinas_cartao || [],
            caixa: registroSaldo.detalhes?.caixa || 0,
          };
          
          const partes = fonte_selecionada.split(':');
          const tipoFonte = partes[0];
          const idFonte = partes[1];
          const delta = tipo === 'recebimento' ? valor_liquidacao : -valor_liquidacao;
          
          if (tipoFonte === 'banco') {
            detalhes.bancos = detalhes.bancos.map(b =>
              b.id === idFonte ? { ...b, saldo: Math.max(0, (b.saldo || 0) + delta) } : b
            );
          } else if (tipoFonte === 'maquina') {
            detalhes.maquinas_cartao = detalhes.maquinas_cartao.map(m =>
              m.id === idFonte ? { ...m, saldo: Math.max(0, (m.saldo || 0) + delta) } : m
            );
          } else if (tipoFonte === 'caixa') {
            detalhes.caixa = Math.max(0, detalhes.caixa + delta);
          }
          
          const novoTotal = detalhes.bancos.reduce((s, b) => s + (b.saldo || 0), 0)
            + detalhes.maquinas_cartao.reduce((s, m) => s + (m.saldo || 0), 0)
            + detalhes.caixa;
          
          await base44.asServiceRole.entities.DFCLancamento.update(registroSaldo.id, {
            detalhes,
            valor: novoTotal,
            saldo_inicial: novoTotal,
          });
        }
      } catch (_) { /* não bloqueia se não houver saldo */ }
    }

    // 5. Vincula DRELancamento se existir
    try {
      if (conta.dre_lancamento_id) {
        await base44.asServiceRole.entities.DRELancamento.update(conta.dre_lancamento_id, {
          data_pagamento: data_liquidacao
        });
      }
    } catch (_) {}

    return Response.json({
      success: true,
      liquidacao_id: liquidacao.id,
      conta_status: novoStatus,
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      dfc_gerado: true,
      mes_dfc: mesReferencia,
    });

  } catch (error) {
    console.error('Erro registrarLiquidacao:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularDiasAtraso(dataVencimento, dataPagamento) {
  if (!dataVencimento || !dataPagamento) return 0;
  const vencimento = new Date(dataVencimento);
  const pagamento = new Date(dataPagamento);
  const diffTime = pagamento.getTime() - vencimento.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}