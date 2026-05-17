import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * BACKFILL: Identifica e marca lançamentos recorrentes
 * 
 * Analisa DRELancamentos e identifica padrões de recorrência baseados em:
 * - Mesma descrição/categoria em meses consecutivos
 * - Valores similares (variação <= 10%)
 * - Intervalo regular (mensal, trimestral, etc)
 * 
 * Parâmetros:
 * - dry_run: true = apenas preview, false = aplica mudanças
 * - workshop_id: ID da oficina
 * - ano: Ano de referência (ex: 2026)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { dry_run = true, workshop_id, ano = 2026 } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    // Busca todos os lançamentos do ano
    const lancamentos = await base44.entities.DRELancamento.filter({
      workshop_id,
      mes: `${ano}-`
    });

    console.log(`[Backfill] Encontrados ${lancamentos.length} lançamentos em ${ano}`);

    // Agrupa por descrição + categoria + tipo
    const grupos = new Map();
    
    lancamentos.forEach((lanc) => {
      const key = `${lanc.descricao}|${lanc.categoria}|${lanc.tipo}`;
      
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key).push(lanc);
    });

    console.log(`[Backfill] ${grupos.size} grupos únicos identificados`);

    const resultados = {
      dry_run,
      workshop_id,
      ano,
      total_lancamentos: lancamentos.length,
      grupos_analisados: grupos.size,
      recorrencias_identificadas: [],
      atualizacoes_pendentes: 0,
      erros: []
    };

    // Analisa cada grupo em busca de padrões
    for (const [key, itens] of grupos.entries()) {
      if (itens.length < 2) continue; // Precisa de pelo menos 2 meses para ser recorrente

      const [descricao, categoria, tipo] = key.split('|');
      
      // Ordena por mês
      itens.sort((a, b) => a.mes.localeCompare(b.mes));

      // Verifica se são meses consecutivos
      const mesesOcorrentes = itens.map(i => i.mes);
      const consecutivos = verificarConsecutividade(mesesOcorrentes);

      // Verifica se valores são similares (variação <= 10%)
      const valores = itens.map(i => i.valor);
      const valorMedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      const variacaoMaxima = Math.max(...valores.map(v => Math.abs(v - valorMedio) / valorMedio));

      // Critérios para considerar recorrente:
      // - Pelo menos 2 meses
      // - Variação <= 10% (ou valores idênticos)
      // - Preferência: meses consecutivos
      const eRecorrente = itens.length >= 2 && variacaoMaxima <= 0.15;

      if (eRecorrente) {
        const recorrencia = {
          descricao,
          categoria,
          tipo,
          meses: mesesOcorrentes,
          qtd_meses: itens.length,
          valor_medio: valorMedio,
          variacao: variacaoMaxima,
          consecutivos,
          lancamentos_ids: itens.map(i => i.id),
          acao: dry_run ? 'SERIA_ATUALIZADO' : 'ATUALIZADO'
        };

        resultados.recorrencias_identificadas.push(recorrencia);
        resultados.atualizacoes_pendentes += itens.length;

        // Se não for dry run, atualiza os lançamentos
        if (!dry_run) {
          const recorrencia_id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          for (const lanc of itens) {
            try {
              await base44.entities.DRELancamento.update(lanc.id, {
                recorrencia_id,
                recorrente: true
              });
            } catch (err) {
              resultados.erros.push({
                lancamento_id: lanc.id,
                erro: err.message
              });
            }
          }
        }
      }
    }

    console.log(`[Backfill] ${resultados.recorrencias_identificadas.length} recorrências identificadas`);

    return Response.json(resultados);
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

/**
 * Verifica se lista de meses é consecutiva
 */
function verificarConsecutividade(meses) {
  if (meses.length < 2) return false;

  for (let i = 1; i < meses.length; i++) {
    const [ano1, mes1] = meses[i - 1].split('-').map(Number);
    const [ano2, mes2] = meses[i].split('-').map(Number);

    const diffMeses = (ano2 - ano1) * 12 + (mes2 - mes1);
    
    if (diffMeses !== 1) {
      return false;
    }
  }

  return true;
}