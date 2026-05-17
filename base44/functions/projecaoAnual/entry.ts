import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, meses_futuros = 12, considerar_sazonalidade = false } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar recorrências ativas
    const lancamentosAtuais = await base44.entities.DRELancamento.filter({
      workshop_id
    }, '-mes', 200);

    // Identificar padrões de recorrência
    const recorrenciasMap = {};
    
    lancamentosAtuais.forEach(l => {
      const chave = `${l.categoria}-${l.subcategoria || ''}-${l.descricao || ''}-${l.tipo}`;
      
      if (!recorrenciasMap[chave]) {
        recorrenciasMap[chave] = {
          categoria: l.categoria,
          subcategoria: l.subcategoria,
          descricao: l.descricao,
          tipo: l.tipo,
          valor_medio: 0,
          meses_ativos: [],
          valores_por_mes: {}
        };
      }
      
      recorrenciasMap[chave].meses_ativos.push(l.mes);
      recorrenciasMap[chave].valores_por_mes[l.mes] = l.valor;
    });

    // Calcular médias e detectar sazonalidade
    const recorrencias = Object.values(recorrenciasMap).filter(r => {
      // Considerar apenas itens com pelo menos 3 meses de histórico
      if (r.meses_ativos.length < 3) return false;
      
      // Calcular valor médio
      const total = Object.values(r.valores_por_mes).reduce((sum, v) => sum + v, 0);
      r.valor_medio = total / r.meses_ativos.length;
      
      return true;
    });

    // Gerar projeção para próximos 12 meses
    const projecaoMensal = [];
    const dataAtual = new Date();
    
    for (let i = 1; i <= meses_futuros; i++) {
      const dataProjecao = new Date(dataAtual);
      dataProjecao.setMonth(dataProjecao.getMonth() + i);
      const mesRef = `${dataProjecao.getFullYear()}-${String(dataProjecao.getMonth() + 1).padStart(2, '0')}`;
      const mes_nome = dataProjecao.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      
      const receitas = [];
      const despesas = [];
      
      recorrencias.forEach(r => {
        let valor_projetado = r.valor_medio;
        
        // Aplicar sazonalidade se solicitado
        if (considerar_sazonalidade && r.valores_por_mes[mesRef]) {
          // Usar mesmo mês do ano anterior como referência
          valor_projetado = r.valores_por_mes[mesRef] * 1.1; // 10% crescimento
        }
        
        const item = {
          categoria: r.categoria,
          subcategoria: r.subcategoria,
          descricao: r.descricao,
          valor: Math.round(valor_projetado * 100) / 100
        };
        
        if (r.tipo === 'receita') {
          receitas.push(item);
        } else {
          despesas.push(item);
        }
      });
      
      const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
      const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
      const lucro = totalReceitas - totalDespesas;
      const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;
      
      projecaoMensal.push({
        mes: mesRef,
        mes_nome,
        receitas,
        despesas,
        total_receitas: Math.round(totalReceitas * 100) / 100,
        total_despesas: Math.round(totalDespesas * 100) / 100,
        lucro: Math.round(lucro * 100) / 100,
        margem: Math.round(margem * 100) / 100
      });
    }

    // Totais da projeção
    const totalProjetadoReceitas = projecaoMensal.reduce((sum, m) => sum + m.total_receitas, 0);
    const totalProjetadoDespesas = projecaoMensal.reduce((sum, m) => sum + m.total_despesas, 0);
    const totalProjetadoLucro = totalProjetadoReceitas - totalProjetadoDespesas;
    const mediaMensalReceitas = totalProjetadoReceitas / meses_futuros;
    const mediaMensalDespesas = totalProjetadoDespesas / meses_futuros;
    const mediaMensalLucro = totalProjetadoLucro / meses_futuros;

    return Response.json({
      success: true,
      workshop_id,
      data_geracao: new Date().toISOString(),
      meses_futuros,
      considerar_sazonalidade,
      projecao: projecaoMensal,
      totais: {
        receitas: Math.round(totalProjetadoReceitas * 100) / 100,
        despesas: Math.round(totalProjetadoDespesas * 100) / 100,
        lucro: Math.round(totalProjetadoLucro * 100) / 100,
        media_mensal_receitas: Math.round(mediaMensalReceitas * 100) / 100,
        media_mensal_despesas: Math.round(mediaMensalDespesas * 100) / 100,
        media_mensal_lucro: Math.round(mediaMensalLucro * 100) / 100
      },
      recorrencias_identificadas: recorrencias.length,
      lancamentos_base: lancamentosAtuais.length
    });

  } catch (error) {
    console.error('Erro na projeção anual:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});