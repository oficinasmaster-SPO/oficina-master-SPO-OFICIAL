import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Autorização: admin sempre pode.
    // Usuários 'internal' (todos os colaboradores internos, incluindo BPO)
    // também são autorizados — regra definida pelo time (todos internos habilitados para BPO).
    // FIX QA-2.1: comparava com 'interno', mas o valor canônico do enum é 'internal' —
    // internos recebiam 403 e só admins conseguiam estornar.
    // user_type vem em user.data.user_type ou user.user_type dependendo do SDK.
    const userType  = user.user_type  || user.data?.user_type  || '';
    const userRole  = user.role       || user.data?.role       || '';
    const autorizado = userRole === 'admin' || userType === 'internal';
    const perfilUsuario = userRole || userType || 'desconhecido'; // só para log
    if (!autorizado) {
      return Response.json(
        { error: 'Sem permissão para estornar liquidações. Contate o administrador.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { liquidacao_id, motivo } = body;

    // S1-T1.2: motivo é obrigatório — gera trilha de auditoria rastreável
    if (!motivo || !motivo.trim()) {
      return Response.json({ error: 'Informe o motivo do estorno' }, { status: 400 });
    }

    if (!liquidacao_id) {
      return Response.json({ error: 'ID da liquidação obrigatório' }, { status: 400 });
    }

    // Busca a liquidação
    const liquidacao = await base44.entities.LiquidacaoFinanceira.get(liquidacao_id);

    if (!liquidacao) {
      return Response.json({ error: 'Liquidação não encontrada' }, { status: 404 });
    }

    // Determina qual conta afetar
    const entidadeId = liquidacao.conta_receber_id || liquidacao.conta_pagar_id;
    const entityName = liquidacao.conta_receber_id ? 'ContaReceber' : 'ContaPagar';

    if (!entidadeId) {
      return Response.json({ error: 'Liquidação sem conta vinculada' }, { status: 400 });
    }

    // Busca a conta
    const conta = await base44.entities[entityName].get(entidadeId);

    if (!conta) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Calcula novos valores (reverter)
    // QA: novoValorPago clampado em 0 antes de derivar novoValorAberto
    // para evitar abertura negativa em caso de duplo estorno ou dados inconsistentes.
    const novoValorPago   = Math.max(0, (conta.valor_pago || 0) - liquidacao.valor_liquidacao);
    const novoValorAberto = Math.max(0, conta.valor_original - novoValorPago);
    const novoStatus      = novoValorPago <= 0.01 ? 'aberto' : 'parcial';

    // 1. Reverte ContaReceber ou ContaPagar
    // S1-T1.2: appenda item ao historico_alteracoes para rastreabilidade na UI
    const historicoAtual = conta.historico_alteracoes || [];
    const itemEstorno = {
      tipo: 'estorno',
      usuario_nome: user.full_name || user.email || '—',
      usuario_email: user.email || '',
      data_hora: new Date().toISOString(),
      detalhes: `Estorno de R$${liquidacao.valor_liquidacao.toFixed(2)}. Motivo: ${motivo.trim()}`,
    };
    await base44.entities[entityName].update(entidadeId, {
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      status: novoStatus,
      data_primeiro_pagamento: novoValorPago <= 0.01 ? null : conta.data_primeiro_pagamento,
      dias_atraso: 0,
      historico_alteracoes: [...historicoAtual, itemEstorno],
    });

    // 1.5. Reverte a data_pagamento no DRELancamento vinculado — o registrarLiquidacao
    // a escreveu na baixa; sem esta reversão o DRE continuaria "pago" após o estorno,
    // divergindo do Contas a Pagar/Receber (QA-2.2). Se restarem outras liquidações
    // (estorno parcial), a data passa a ser a da baixa restante mais recente.
    // A liquidação atual ainda existe neste ponto, então é excluída do cálculo.
    try {
      if (conta.dre_lancamento_id) {
        const liqs = await base44.entities.LiquidacaoFinanceira.filter(
          liquidacao.conta_receber_id
            ? { conta_receber_id: entidadeId }
            : { conta_pagar_id: entidadeId },
          '-data_liquidacao', 5
        );
        const restantes = (liqs || []).filter(l => l.id !== liquidacao_id);
        const dataPagamento = restantes.length > 0 ? restantes[0].data_liquidacao : null;
        await base44.entities.DRELancamento.update(conta.dre_lancamento_id, {
          data_pagamento: dataPagamento,
        });
      }
    } catch (_) {
      // reversão do DRE falha silenciosamente — não bloqueia o estorno
    }

    // 2. Deleta DFCLancamentos gerados por esta liquidação (se existirem)
    try {
      const dfcs = await base44.entities.DFCLancamento.filter({
        liquidacao_financeira_id: liquidacao_id,
      });
      for (const dfc of (dfcs || [])) {
        await base44.entities.DFCLancamento.delete(dfc.id);
      }
    } catch (_) {
      // DFCs podem não existir — continua
    }

    // 3. Desconcilia a BankTransaction vinculada (se existir).
    // Sem isto, a transação bancária ficaria com status 'conciliado' e
    // liquidacao_financeira_id apontando para um registro deletado — dado corrompido.
    // Executado ANTES de deletar a LiquidacaoFinanceira para que o filtro funcione.
    try {
      const bankTxs = await base44.entities.BankTransaction.filter(
        { liquidacao_financeira_id: liquidacao_id },
        '-data_operacao',
        1
      );
      const bankTx = bankTxs?.[0];
      if (bankTx) {
        await base44.entities.BankTransaction.update(bankTx.id, {
          status_conciliacao: 'pendente',
          liquidacao_financeira_id: null,
          data_conciliacao: null,
          conciliado_por: null,
        });
      }
    } catch (_) {
      // BankTransaction pode não existir (liquidação não conciliada) — continua
    }

    // 3.1. Deleta a LiquidacaoFinanceira
    await base44.entities.LiquidacaoFinanceira.delete(liquidacao_id);

    // 3.5. Reverte o saldo da fonte (banco / máquina / caixa) que foi alterado no pagamento.
    // banco_origem = fonte usada em pagamento; banco_destino = fonte usada em recebimento.
    const fonteKey = liquidacao.banco_origem || liquidacao.banco_destino || null;
    if (fonteKey) {
      try {
        const mesLiquidacao = String(liquidacao.data_liquidacao).slice(0, 7);
        const registrosSaldo = await base44.entities.DFCLancamento.filter(
          { workshop_id: liquidacao.workshop_id || conta.workshop_id, mes: mesLiquidacao, grupo: 'saldo_inicial' },
          '-updated_date', 1
        );
        const regSaldo = registrosSaldo?.[0];
        if (regSaldo) {
          const det = {
            bancos: regSaldo.detalhes?.bancos || [],
            maquinas_cartao: regSaldo.detalhes?.maquinas_cartao || [],
            caixa: regSaldo.detalhes?.caixa || 0,
          };
          // O estorno INVERTE o delta original:
          // pagamento subtraiu da fonte → estorno soma de volta.
          // recebimento somou na fonte → estorno subtrai.
          const delta = liquidacao.tipo === 'pagamento'
            ? liquidacao.valor_liquidacao   // devolve o dinheiro à fonte
            : -liquidacao.valor_liquidacao; // remove o recebimento da fonte
          const partes = fonteKey.split(':');
          const tipoFonte = partes[0];  // 'banco' | 'maquina' | 'caixa'
          const idFonte   = partes[1];  // id do banco/máquina ou 'caixa'
          if (tipoFonte === 'banco') {
            det.bancos = det.bancos.map(b =>
              b.id === idFonte ? { ...b, saldo: Math.max(0, (b.saldo || 0) + delta) } : b
            );
          } else if (tipoFonte === 'maquina') {
            det.maquinas_cartao = det.maquinas_cartao.map(m =>
              m.id === idFonte ? { ...m, saldo: Math.max(0, (m.saldo || 0) + delta) } : m
            );
          } else if (tipoFonte === 'caixa') {
            det.caixa = Math.max(0, det.caixa + delta);
          }
          const novoTotal =
            det.bancos.reduce((s, b) => s + (b.saldo || 0), 0) +
            det.maquinas_cartao.reduce((s, m) => s + (m.saldo || 0), 0) +
            det.caixa;
          await base44.entities.DFCLancamento.update(regSaldo.id, {
            detalhes: det,
            valor: novoTotal,
            saldo_inicial: novoTotal,
          });
        }
      } catch (_) {
        // Reversão de saldo falha silenciosamente — não bloqueia o estorno
      }
    }

    // 4. Registra auditoria com motivo informado pelo usuário (falha silenciosa)
    try {
      await base44.functions.invoke('auditLog', {
        acao: 'desfazer_liquidacao',
        entidade: 'LiquidacaoFinanceira',
        entidade_id: liquidacao_id,
        usuario_id: user.id,
        usuario_email: user.email,
        detalhes: {
          motivo: motivo.trim(),
          valor: liquidacao.valor_liquidacao,
          conta_id: entidadeId,
          conta_tipo: entityName,
          perfil_usuario: perfilUsuario,
        },
      });
    } catch (_) {
      // auditLog falha silenciosamente — o estorno já foi concluído com sucesso
    }

    return Response.json({
      success: true,
      message: 'Liquidação desfeita com sucesso',
      conta_status: novoStatus,
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      conciliacao_revertida: !!(liquidacao.conciliado), // sinaliza ao frontend para invalidar bank-transactions
    });

  } catch (error) {
    console.error('Erro ao desfazer liquidação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});