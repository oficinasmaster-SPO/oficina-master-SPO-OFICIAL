import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workshop_id } = await req.json();
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id is required' }, { status: 400 });
    }

    // Buscar todos os lançamentos das 3 tabelas
    const [contas_pagar, contas_receber, dre_lancamentos] = await Promise.all([
      base44.entities.ContaPagar.list('', 1000).catch(() => []),
      base44.entities.ContaReceber.list('', 1000).catch(() => []),
      base44.entities.DRELancamento.list('', 1000).catch(() => [])
    ]);

    const todasasContas = [
      ...contas_pagar.map(c => ({ ...c, tipo: 'ContaPagar' })),
      ...contas_receber.map(c => ({ ...c, tipo: 'ContaReceber' })),
      ...dre_lancamentos.map(c => ({ ...c, tipo: 'DRELancamento' }))
    ].filter(c => c.workshop_id === workshop_id);

    // Agrupar por: nome + valor + data_vencimento
    const grupos = {};
    todasasContas.forEach(item => {
      const key = `${item.fornecedor_nome || item.cliente_nome || item.descricao}|${item.valor}|${item.data_vencimento || item.data_pagamento}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });

    // Processar grupos com duplicatas
    const correcoes = [];
    const erros = [];

    for (const [key, items] of Object.entries(grupos)) {
      if (items.length <= 1) continue; // Sem duplicatas

      // Ordenar por data de criação para manter o primeiro
      items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      // Manter o primeiro e redistribuir os demais
      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const mesesAdiante = i;
        
        try {
          // Calcular nova data de vencimento
          const dataOriginal = new Date(item.data_vencimento || item.data_pagamento);
          const novaData = new Date(dataOriginal);
          novaData.setMonth(novaData.getMonth() + mesesAdiante);
          const novaDataStr = novaData.toISOString().split('T')[0];

          // Calcular novo mês (YYYY-MM)
          const novoMes = novaData.toISOString().substring(0, 7);

          // Atualizar conforme tipo
          const updateData = {
            data_vencimento: novaDataStr,
            mes: novoMes
          };

          if (item.parcela_numero && item.parcela_total) {
            updateData.parcela_numero = item.parcela_numero + mesesAdiante;
          }

          await base44.entities[item.tipo].update(item.id, updateData);

          correcoes.push({
            id: item.id,
            nome: item.fornecedor_nome || item.cliente_nome || item.descricao,
            tipo: item.tipo,
            mesesAdiante,
            novaData: novaDataStr,
            novoMes,
            valor: item.valor
          });
        } catch (err) {
          erros.push({
            id: item.id,
            nome: item.fornecedor_nome || item.cliente_nome || item.descricao,
            erro: err.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      resumo: {
        grupos_processados: Object.values(grupos).filter(g => g.length > 1).length,
        total_duplicatas_corrigidas: correcoes.length,
        erros: erros.length
      },
      correcoes: correcoes.slice(0, 50), // Primeiros 50
      erros: erros.slice(0, 20)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});