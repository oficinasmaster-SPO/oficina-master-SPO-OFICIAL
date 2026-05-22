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

    // Buscar apenas ContaPagar (foco principal)
    const contas_pagar = await base44.entities.ContaPagar.list('', 2000);
    const todasasContas = contas_pagar
      .filter(c => c.workshop_id === workshop_id)
      .map(c => ({ ...c, tipo: 'ContaPagar' }));

    // Agrupar por: nome + valor + data_vencimento
    const grupos = {};
    todasasContas.forEach(item => {
      const key = `${item.fornecedor_nome || 'N/A'}|${item.valor_original}|${item.data_vencimento}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(item);
    });

    // Processar apenas grupos com duplicatas
    const correcoes = [];
    const erros = [];
    let processados = 0;

    for (const [key, items] of Object.entries(grupos)) {
      if (items.length <= 1) continue;

      items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      for (let i = 1; i < items.length; i++) {
        const item = items[i];
        const mesesAdiante = i;
        
        try {
          const dataOriginal = new Date(item.data_vencimento);
          const novaData = new Date(dataOriginal);
          novaData.setMonth(novaData.getMonth() + mesesAdiante);
          const novaDataStr = novaData.toISOString().split('T')[0];
          const novoMes = novaData.toISOString().substring(0, 7);

          await base44.entities.ContaPagar.update(item.id, {
            data_vencimento: novaDataStr,
            mes: novoMes
          });

          correcoes.push({
            id: item.id,
            nome: item.fornecedor_nome,
            mesesAdiante,
            novaData: novaDataStr,
            novoMes,
            valor: item.valor_original
          });
          
          processados++;
          
          // Delay para evitar rate limit
          if (processados % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          erros.push({
            id: item.id,
            nome: item.fornecedor_nome,
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
      correcoes: correcoes.slice(0, 100),
      erros: erros.slice(0, 50)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});