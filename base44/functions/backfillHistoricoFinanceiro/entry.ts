import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { workshop_id, meses_back = 12 } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const resultados = {
      dre_migrados: 0,
      dfc_migrados: 0,
      contas_receber_criadas: 0,
      contas_pagar_criadas: 0,
      liquidacoes_criadas: 0,
      erros: []
    };

    // Calcula período (últimos N meses)
    const hoje = new Date();
    const periodoInicio = new Date(hoje);
    periodoInicio.setMonth(periodoInicio.getMonth() - meses_back);

    for (let i = 0; i < meses_back; i++) {
      const dataRef = new Date(periodoInicio);
      dataRef.setMonth(dataRef.getMonth() + i);
      const mes = `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}`;

      try {
        // 1. Migrar DRE
        const dreLancamentos = await base44.entities.DRELancamento.filter({
          workshop_id,
          mes
        });

        for (const lancamento of dreLancamentos) {
          // Verifica se já existe ContaReceber/ContaPagar
          const existeConta = await base44.entities.ContaReceber.filter({
            dre_lancamento_id: lancamento.id
          });

          if (existeConta.length === 0 && lancamento.tipo === 'receita') {
            // Cria ContaReceber
            await base44.entities.ContaReceber.create({
              workshop_id,
              dre_lancamento_id: lancamento.id,
              cliente_id: 'historico_migration',
              cliente_nome: lancamento.descricao || 'Cliente Histórico',
              valor_original: lancamento.valor,
              valor_aberto: 0,
              valor_pago: lancamento.valor,
              status: 'pago',
              data_vencimento: lancamento.data_vencimento || `${mes}-10`,
              data_emissao: lancamento.data_vencimento || `${mes}-01`,
              data_primeiro_pagamento: `${mes}-15`,
              numero_documento: `DRE-${lancamento.id}`,
              tipo_documento: 'nota_fiscal',
              forma_pagamento: 'pix',
              parcela_numero: 1,
              parcela_total: 1,
              observacoes: 'Migrado via backfill - FASE 5'
            });
            resultados.contas_receber_criadas++;
          }

          if (existeConta.length === 0 && lancamento.tipo === 'despesa') {
            // Cria ContaPagar
            await base44.entities.ContaPagar.create({
              workshop_id,
              dre_lancamento_id: lancamento.id,
              fornecedor_id: 'historico_migration',
              fornecedor_nome: lancamento.descricao || 'Fornecedor Histórico',
              valor_original: lancamento.valor,
              valor_aberto: 0,
              valor_pago: lancamento.valor,
              status: 'pago',
              data_vencimento: lancamento.data_vencimento || `${mes}-10`,
              data_emissao: lancamento.data_vencimento || `${mes}-01`,
              numero_documento: `DRE-${lancamento.id}`,
              tipo_documento: 'nota_fiscal',
              forma_pagamento: 'pix',
              parcela_numero: 1,
              parcela_total: 1,
              categoria: lancamento.categoria,
              centro_custo: lancamento.subcategoria || 'Geral',
              observacoes: 'Migrado via backfill - FASE 5'
            });
            resultados.contas_pagar_criadas++;
          }

          resultados.dre_migrados++;
        }

        // 2. Migrar DFC
        const dfcLancamentos = await base44.entities.DFCLancamento.filter({
          workshop_id,
          mes
        });

        for (const lancamento of dfcLancamentos) {
          // Se for lançamento manual, cria liquidação correspondente
          if (lancamento.origem === 'manual') {
            const tipo = lancamento.tipo === 'entrada' ? 'recebimento' : 'pagamento';
            
            await base44.entities.LiquidacaoFinanceira.create({
              workshop_id,
              tipo,
              valor_liquidacao: lancamento.valor,
              data_liquidacao: `${mes}-15`,
              forma_pagamento: 'pix',
              numero_documento: `DFC-${lancamento.id}`,
              observacoes: 'Migrado via backfill - FASE 5',
              conciliado: true,
              data_conciliacao: `${mes}-20`
            });
            resultados.liquidacoes_criadas++;
          }

          resultados.dfc_migrados++;
        }

      } catch (error) {
        resultados.erros.push({
          mes,
          erro: error.message
        });
      }
    }

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'backfill_historico',
      entidade: 'Multiple',
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        workshop_id,
        meses_back,
        resultados
      }
    });

    return Response.json({
      success: true,
      message: 'Backfill concluído',
      resultados,
      resumo: {
        total_operacoes: resultados.dre_migrados + resultados.dfc_migrados + 
                        resultados.contas_receber_criadas + resultados.contas_pagar_criadas + 
                        resultados.liquidacoes_criadas,
        erros_count: resultados.erros.length
      }
    });

  } catch (error) {
    console.error('Erro no backfill:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});