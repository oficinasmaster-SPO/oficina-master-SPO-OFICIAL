import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * MIGRAÇÃO: Soma metas mensais e cria meta anual
 * 
 * Para cada categoria/item em 2026:
 * - Soma as 12 metas mensais
 * - Cria BudgetMeta com periodicidade="anual"
 * - Mantém metas mensais existentes como backup
 * 
 * Parâmetros:
 * - workshop_id: ID da oficina
 * - ano: Ano de referência (ex: 2026)
 * - dry_run: true = preview, false = aplica
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { workshop_id, ano = 2026, dry_run = true } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    // Busca todas as metas mensais do ano
    const metasMensais = await base44.entities.BudgetMeta.filter({
      workshop_id,
      mes: `${ano}-`
    });

    console.log(`[MigrarMetas] Encontradas ${metasMensais.length} metas mensais em ${ano}`);

    // Agrupa por item + categoria + tipo
    const grupos = new Map();

    metasMensais.forEach((meta) => {
      const key = `${meta.item}|${meta.categoria}|${meta.tipo}`;
      
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(meta);
    });

    console.log(`[MigrarMetas] ${grupos.size} itens únicos`);

    const resultados = {
      dry_run,
      workshop_id,
      ano,
      total_metas_mensais: metasMensais.length,
      itens_analisados: grupos.size,
      metas_anuais_criadas: 0,
      metas_anuais_preview: [],
      erros: []
    };

    // Para cada grupo, calcula meta anual
    for (const [key, metas] of grupos.entries()) {
      const [item, categoria, tipo] = key.split('|');

      // Soma todas as metas mensais
      const metaAnualTotal = metas.reduce((sum, m) => {
        const metaMes = m.meta_fixa_rs || 0;
        return sum + metaMes;
      }, 0);

      // Calcula meta acumulada por mês (para acompanhamento)
      const metasPorMes = {};
      metas.forEach(m => {
        metasPorMes[m.mes] = m.meta_fixa_rs || 0;
      });

      const metaAcumuladaMes = {};
      let acumulado = 0;
      const mesesOrdenados = Object.keys(metasPorMes).sort();
      mesesOrdenados.forEach(mes => {
        acumulado += metasPorMes[mes];
        metaAcumuladaMes[mes] = acumulado;
      });

      // Preview da meta anual
      const metaAnual = {
        item,
        categoria,
        tipo,
        meta_anual_rs: metaAnualTotal,
        meta_mensal_media: metaAnualTotal / 12,
        qtd_meses_com_meta: metas.length,
        meta_acumulada_por_mes: metaAcumuladaMes,
        acao: dry_run ? 'SERIA_CRIADA' : 'CRIADA'
      };

      resultados.metas_anuais_preview.push(metaAnual);

      // Se não for dry run, cria a meta anual
      if (!dry_run) {
        try {
          await base44.entities.BudgetMeta.create({
            workshop_id,
            mes: `${ano}-ANUAL`,
            item,
            categoria,
            tipo,
            meta_fixa_rs: metaAnualTotal,
            meta_percentual: 0,
            faturamento_meta_rs: 0,
            periodicidade: 'anual',
            meta_anual_rs: metaAnualTotal,
            meta_acumulada_mes: metaAcumuladaMes,
            controlar_orcamento: true,
            notas: `Meta anual consolidada a partir de ${metas.length} meses`
          });

          resultados.metas_anuais_criadas++;
        } catch (err) {
          resultados.erros.push({
            item,
            erro: err.message
          });
        }
      }
    }

    console.log(`[MigrarMetas] ${resultados.metas_anuais_preview.length} metas anuais processadas`);

    return Response.json(resultados);
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});